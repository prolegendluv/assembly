import { useCallback, useEffect, useRef, useState } from "react";
import { base64DecodePCM16, base64EncodePCM16, floatTo16BitPCM, resampleTo24k, PlaybackQueue } from "../lib/audio";
import { playRadioChirp, playEmergencyAlarm } from "../lib/soundEffects";

export type ChatMsg = { role: "user" | "agent" | "system"; text: string; final: boolean; timestamp?: string };
export type ToolEvent = { name: string; args: any; result?: any; at: string; ms?: number };

type AgentConfig = { system_prompt: string; greeting: string; voice: string; tools: any[] };

export function useAgentSession() {
    const [status, setStatus] = useState<"idle" | "connecting" | "live" | "error">("idle");
    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);
    const [sessionId, setSessionId] = useState("");
    const [error, setError] = useState("");
    const [audioLevel, setAudioLevel] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const micRef = useRef<{ ctx: AudioContext; stream: MediaStream; proc: ScriptProcessorNode } | null>(null);
    const playRef = useRef<PlaybackQueue | null>(null);
    const sessionIdRef = useRef("");
    const isSessionReadyRef = useRef(false);
    const pendingTools = useRef<Map<string, { name: string; args: any }>>(new Map());
    const timerRef = useRef<any>(null);

    const pushMsg = (m: ChatMsg) => {
        const msgWithTime = { ...m, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) };
        setMessages((p) => {
            if (!m.final && p.length > 0 && p[p.length - 1].role === m.role && !p[p.length - 1].final) {
                // update current interim
                return [...p.slice(0, -1), msgWithTime];
            }
            return [...p.slice(-99), msgWithTime];
        });
    };

    const cleanup = useCallback(() => {
        isSessionReadyRef.current = false;
        try {
            wsRef.current?.close();
        } catch { }
        wsRef.current = null;

        try {
            micRef.current?.proc.disconnect();
            micRef.current?.stream.getTracks().forEach((t) => t.stop());
            if (micRef.current?.ctx && micRef.current.ctx.state !== "closed") {
                micRef.current.ctx.close();
            }
        } catch { }
        micRef.current = null;

        try {
            playRef.current?.close();
        } catch { }
        playRef.current = null;

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setAudioLevel(0);
        setIsAgentSpeaking(false);
    }, []);

    useEffect(() => () => cleanup(), [cleanup]);

    const executeToolViaServer = async (call_id: string, name: string, args: any) => {
        const startTime = Date.now();
        const eventItem: ToolEvent = {
            name,
            args,
            at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        };
        setToolEvents((p) => [...p, eventItem]);

        try {
            const r = await fetch("/api/tools/execute", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ session_id: sessionIdRef.current, name, args }),
            });
            const { result } = await r.json();
            const elapsed = Date.now() - startTime;
            setToolEvents((p) =>
                p.map((e, i) => (i === p.length - 1 ? { ...e, result, ms: elapsed } : e))
            );
            // AssemblyAI Voice Agent protocol strictly expects 'result' to be a JSON-encoded string
            const resultString = typeof result === "string" ? result : JSON.stringify(result ?? {});
            wsRef.current?.send(
                JSON.stringify({
                    type: "tool.result",
                    call_id,
                    result: resultString,
                })
            );
            pendingTools.current.delete(call_id);
        } catch (e: any) {
            const elapsed = Date.now() - startTime;
            const result = { error: String(e?.message ?? e) };
            setToolEvents((p) =>
                p.map((e, i) => (i === p.length - 1 ? { ...e, result, ms: elapsed } : e))
            );
            wsRef.current?.send(
                JSON.stringify({
                    type: "tool.result",
                    call_id,
                    result: JSON.stringify(result),
                })
            );
            pendingTools.current.delete(call_id);
        }
    };

    const start = useCallback(async () => {
        setError("");
        setStatus("connecting");
        setDuration(0);
        isSessionReadyRef.current = false;

        try {
            // 1. Initialize AudioContexts synchronously within user gesture to avoid browser autoplay suspension
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const playAudioCtx = new AudioContextClass();
            if (playAudioCtx.state === "suspended") {
                await playAudioCtx.resume();
            }
            playRef.current = new PlaybackQueue(playAudioCtx);

            // 2. Request microphone stream with voice-enhancement constraints
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            // 3. Create Mic processing node without routing to destination (zero gain to prevent feedback)
            const micAudioCtx = new AudioContextClass();
            if (micAudioCtx.state === "suspended") {
                await micAudioCtx.resume();
            }
            const micSrc = micAudioCtx.createMediaStreamSource(stream);
            const micProc = micAudioCtx.createScriptProcessor(4096, 1, 1);
            const muteGain = micAudioCtx.createGain();
            muteGain.gain.value = 0; // Prevent microphone from howling back through speakers
            micSrc.connect(micProc);
            micProc.connect(muteGain);
            muteGain.connect(micAudioCtx.destination);
            micRef.current = { ctx: micAudioCtx, stream, proc: micProc };

            micProc.onaudioprocess = (e) => {
                const float = e.inputBuffer.getChannelData(0);

                // Calculate RMS level for reactive UI waveform
                let sum = 0;
                for (let i = 0; i < float.length; i++) {
                    sum += float[i] * float[i];
                }
                const rms = Math.sqrt(sum / float.length);
                setAudioLevel(Math.min(1, rms * 6));

                // Send 24kHz PCM16 audio only when WebSocket is live and session is ready
                if (
                    wsRef.current &&
                    wsRef.current.readyState === WebSocket.OPEN &&
                    isSessionReadyRef.current
                ) {
                    const res = resampleTo24k(new Float32Array(float), micAudioCtx.sampleRate);
                    const pcm = floatTo16BitPCM(res);
                    wsRef.current.send(JSON.stringify({ type: "input.audio", audio: base64EncodePCM16(pcm) }));
                }
            };

            // 4. Fetch agent configuration & single-use auth token
            const [cfgR, tokR] = await Promise.all([fetch("/api/agent-config"), fetch("/api/token")]);
            if (!cfgR.ok) throw new Error("Agent configuration request failed");
            if (!tokR.ok) {
                const errData = await tokR.json().catch(() => ({}));
                throw new Error(errData.error || "Token generation failed — check ASSEMBLYAI_API_KEY in server .env");
            }
            const cfg = (await cfgR.json()) as AgentConfig;
            const { token } = await tokR.json();

            // 5. Connect to AssemblyAI Voice Agent WebSocket
            const ws = new WebSocket(`wss://agents.assemblyai.com/v1/ws?token=${encodeURIComponent(token)}`);
            wsRef.current = ws;

            ws.onopen = () => {
                ws.send(
                    JSON.stringify({
                        type: "session.update",
                        session: {
                            system_prompt: cfg.system_prompt,
                            greeting: cfg.greeting,
                            input: {
                                format: { encoding: "audio/pcm" },
                                keyterms: [
                                    "bay 1", "bay 2", "bay 3", "dock 1", "gate A",
                                    "North Yard", "Warehouse B", "aisle 1", "aisle 2", "cold room", "loading dock",
                                    "spill", "near miss", "first-aid", "ammonia", "diesel", "battery acid", "chlorine",
                                    "spill kit", "eyewash station", "AED", "fire extinguisher", "substation", "evacuation", "OSHA", "HAZMAT"
                                ],
                                turn_detection: { vad_threshold: 0.5, min_silence: 200, max_silence: 1000, interrupt_response: true },
                            },
                            output: { voice: cfg.voice, format: { encoding: "audio/pcm" } },
                            tools: cfg.tools,
                        },
                    })
                );
            };

            ws.onmessage = (ev) => {
                let msg: any;
                try {
                    msg = JSON.parse(ev.data);
                } catch {
                    return;
                }

                switch (msg.type) {
                    case "session.ready":
                        setSessionId(msg.session_id ?? "");
                        sessionIdRef.current = msg.session_id ?? "";
                        isSessionReadyRef.current = true;
                        setStatus("live");
                        playRadioChirp("open");
                        if (timerRef.current) clearInterval(timerRef.current);
                        timerRef.current = setInterval(() => {
                            setDuration((d) => d + 1);
                        }, 1000);
                        break;

                    case "transcript.user.delta":
                        // User barge-in: flush playing speech immediately so agent stops talking
                        playRef.current?.flush();
                        setIsAgentSpeaking(false);
                        pushMsg({ role: "user", text: msg.transcript ?? "", final: false });
                        break;

                    case "transcript.user":
                        pushMsg({ role: "user", text: msg.transcript ?? "", final: true });
                        break;

                    case "transcript.agent.delta":
                        setIsAgentSpeaking(true);
                        pushMsg({ role: "agent", text: msg.transcript ?? "", final: false });
                        break;

                    case "transcript.agent":
                        pushMsg({ role: "agent", text: msg.transcript ?? "", final: true });
                        break;

                    case "reply.audio":
                        setIsAgentSpeaking(true);
                        if (msg.data && playRef.current) {
                            playRef.current.enqueue(base64DecodePCM16(msg.data));
                        }
                        break;

                    case "reply.done":
                        setIsAgentSpeaking(false);
                        if (msg.status === "interrupted") {
                            playRef.current?.flush();
                            pendingTools.current.clear();
                        }
                        break;

                    case "tool.call": {
                        const { call_id, name, arguments: rawArgs } = msg;
                        let args = rawArgs;
                        if (typeof rawArgs === "string") {
                            try {
                                args = JSON.parse(rawArgs);
                            } catch {
                                args = {};
                            }
                        }
                        if (name === "trigger_emergency_broadcast") {
                            playEmergencyAlarm();
                        }
                        pendingTools.current.set(call_id, { name, args });
                        executeToolViaServer(call_id, name, args);
                        break;
                    }

                    case "session.error":
                    case "error":
                        setError(String(msg.message ?? msg.error ?? "Session error"));
                        setStatus("error");
                        break;
                }
            };

            ws.onerror = () => {
                setError("WebSocket error connecting to AssemblyAI Voice Agent");
                setStatus("error");
            };

            ws.onclose = () => {
                if (sessionIdRef.current) {
                    setStatus((s) => (s === "live" ? "idle" : s));
                }
                cleanup();
            };
        } catch (e: any) {
            setError(String(e?.message ?? e));
            setStatus("error");
            cleanup();
        }
    }, [cleanup]);

    const stop = useCallback(() => {
        isSessionReadyRef.current = false;
        try {
            wsRef.current?.send(JSON.stringify({ type: "session.end" }));
        } catch { }
        playRadioChirp("close");
        cleanup();
        setStatus("idle");
    }, [cleanup]);

    const clearMessages = useCallback(() => {
        setMessages([]);
        setToolEvents([]);
    }, []);

    return {
        status,
        messages,
        toolEvents,
        sessionId,
        error,
        audioLevel,
        duration,
        isAgentSpeaking,
        start,
        stop,
        clearMessages,
    };
}