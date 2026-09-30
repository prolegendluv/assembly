import React, { useState, useEffect } from "react";
import { MicIcon, MicOffIcon, SparklesIcon, AlertTriangleIcon, ActivityIcon } from "./Icons";

interface VoiceControllerProps {
    status: "idle" | "connecting" | "live" | "error";
    audioLevel: number;
    error: string;
    duration: number;
    isAgentSpeaking: boolean;
    sessionId?: string;
    onStart: () => void;
    onStop: () => void;
    onSelectPrompt?: (text: string) => void;
}

interface PromptSuggestion {
    id: string;
    icon: string;
    tag: string;
    prompt_text: string;
}

export function VoiceController({
    status,
    audioLevel,
    error,
    duration,
    isAgentSpeaking,
    sessionId,
    onStart,
    onStop,
    onSelectPrompt,
}: VoiceControllerProps) {
    const [prompts, setPrompts] = useState<PromptSuggestion[]>([]);
    const isLive = status === "live";
    const isConnecting = status === "connecting";

    useEffect(() => {
        let mounted = true;
        fetch("/api/suggested-prompts")
            .then((r) => r.json())
            .then((data) => {
                if (!mounted) return;
                if (data.prompts && Array.isArray(data.prompts)) {
                    setPrompts(
                        data.prompts.map((p: any) => ({
                            id: p.id,
                            icon: p.icon || "💡",
                            tag: p.tag || p.category,
                            prompt_text: p.prompt_text,
                        }))
                    );
                }
            })
            .catch((err) => console.error("Failed to load suggested prompts:", err));
        return () => {
            mounted = false;
        };
    }, []);

    const formatDuration = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s < 10 ? "0" : ""}${s}`;
    };

    // Generate 18 visualizer bar heights dynamically based on audioLevel
    const bars = Array.from({ length: 18 }).map((_, i) => {
        if (!isLive) return 6;
        // center bars get higher amplitude
        const distFromCenter = Math.abs(i - 8.5) / 8.5;
        const curve = 1 - distFromCenter * 0.65;
        const jitter = ((i * 7) % 11) / 10;
        const height = Math.max(6, Math.min(42, Math.round(audioLevel * 45 * curve + jitter * 8)));
        return height;
    });

    return (
        <section className="voice-hero-card" aria-label="Voice Reporting Hub">
            <div className="voice-hero-header">
                <h1 className="voice-hero-title">Hands-Free Voice Safety Report</h1>
                <p className="voice-hero-sub">
                    Tap the button and speak naturally. The AI agent executes structured tool calls
                    (lookup site, draft, update severity, queue follow-ups, file) as you talk.
                </p>
            </div>

            <div className="voice-btn-container">
                {isLive && (
                    <div className="sound-wave-rings" aria-hidden="true">
                        <div className="sound-wave-ring" />
                        <div className="sound-wave-ring" />
                        <div className="sound-wave-ring" />
                    </div>
                )}

                <button
                    className={`voice-tactile-button ${status}`}
                    onClick={isLive ? onStop : onStart}
                    disabled={isConnecting}
                    id="btn-voice-toggle"
                    aria-label={isLive ? "Stop Voice Report" : "Start Voice Report"}
                >
                    {isLive ? <MicOffIcon size={38} /> : <MicIcon size={38} />}
                </button>
            </div>

            {/* Audio Waveform Meter */}
            <div className="audio-visualizer-container" aria-label="Audio Visualizer">
                {bars.map((h, idx) => (
                    <div
                        key={idx}
                        className={`wave-bar ${isLive ? "live-bar" : ""}`}
                        style={{
                            height: `${h}px`,
                            animationDelay: `${(idx * 0.08).toFixed(2)}s`,
                            opacity: isLive ? (isAgentSpeaking ? 0.9 : 0.8) : 0.25,
                            background: isAgentSpeaking
                                ? "linear-gradient(180deg, #a855f7 0%, #6366f1 100%)"
                                : undefined,
                        }}
                    />
                ))}
            </div>

            <div className="session-badge-row">
                <span className="session-chip">
                    <span className={`status-dot ${status}`} />
                    {isConnecting
                        ? "Opening AssemblyAI WebSocket…"
                        : isLive
                        ? isAgentSpeaking
                            ? "SiteSpeak AI speaking…"
                            : "Listening to mic…"
                        : "Ready to record"}
                </span>

                {isLive && (
                    <span className="session-chip">
                        <ActivityIcon size={14} style={{ color: "var(--accent-emerald)" }} />
                        Session: {formatDuration(duration)}
                    </span>
                )}

                {sessionId && (
                    <span className="session-chip" title={sessionId}>
                        ID: {sessionId.slice(0, 8)}…
                    </span>
                )}
            </div>

            {error && (
                <div className="error-banner" role="alert">
                    <AlertTriangleIcon size={18} style={{ flexShrink: 0 }} />
                    <div>{error}</div>
                </div>
            )}

            {/* Demo Prompts / Hints */}
            <div className="prompt-chips-section">
                <div className="prompt-chips-label">
                    <SparklesIcon size={14} style={{ color: "var(--accent-amber)" }} />
                    <span>Try saying or demoing one of these:</span>
                </div>
                <div className="prompt-chips-grid">
                    {prompts.map((p: PromptSuggestion) => (
                        <button
                            key={p.id}
                            className="prompt-chip"
                            onClick={() => onSelectPrompt?.(p.prompt_text)}
                            title="Click to copy suggestion"
                            type="button"
                        >
                            <span>{p.icon}</span>
                            <strong>{p.tag}:</strong>
                            <span style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {p.prompt_text}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
}
