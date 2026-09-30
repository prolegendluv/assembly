import React, { useState, useEffect } from "react";
import { ToolEvent } from "../types";
import { RadioIcon, ActivityIcon, AlertTriangleIcon, CheckCircleIcon } from "./Icons";
import { playRadioChirp, startIndustrialNoise, stopIndustrialNoise, setIndustrialNoiseVolume } from "../lib/soundEffects";

interface SimulationStep {
    speaker: "worker" | "agent" | "system";
    text: string;
    toolCall?: {
        name: string;
        args: Record<string, any>;
    };
    pauseMs?: number;
}

interface Scenario {
    id: string;
    title: string;
    category: string;
    severityBadge: string;
    description: string;
    steps: SimulationStep[];
}

interface SimulationSuiteProps {
    onToolExecuted?: (event: ToolEvent) => void;
    onRefreshIncidents?: () => void;
}

export const SimulationSuite: React.FC<SimulationSuiteProps> = ({
    onToolExecuted,
    onRefreshIncidents,
}) => {
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");
    const [currentStepIdx, setCurrentStepIdx] = useState<number>(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentIncidentId, setCurrentIncidentId] = useState<string>("");
    const [simLogs, setSimLogs] = useState<Array<{ text: string; role: string }>>([]);
    const [noiseActive, setNoiseActive] = useState(false);
    const [noiseVolume, setNoiseVolume] = useState(0.15);

    useEffect(() => {
        let mounted = true;
        fetch("/api/simulation-scenarios")
            .then((r) => r.json())
            .then((data) => {
                if (!mounted) return;
                if (data.scenarios && Array.isArray(data.scenarios) && data.scenarios.length > 0) {
                    setScenarios(data.scenarios);
                    setSelectedScenarioId(data.scenarios[0].id);
                }
            })
            .catch((err) => console.error("Failed to load simulation scenarios:", err));

        return () => {
            mounted = false;
            stopIndustrialNoise();
        };
    }, []);

    const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId) || scenarios[0];

    useEffect(() => {
        return () => {
            stopIndustrialNoise();
        };
    }, []);

    const toggleNoise = () => {
        if (noiseActive) {
            stopIndustrialNoise();
            setNoiseActive(false);
        } else {
            startIndustrialNoise(noiseVolume);
            setNoiseActive(true);
        }
    };

    const handleVolumeChange = (vol: number) => {
        setNoiseVolume(vol);
        setIndustrialNoiseVolume(vol);
    };

    const runStep = async (stepIdx: number) => {
        if (stepIdx >= selectedScenario.steps.length) {
            setIsPlaying(false);
            return;
        }

        const step = selectedScenario.steps[stepIdx];
        setCurrentStepIdx(stepIdx);

        if (step.speaker === "worker") {
            playRadioChirp("open");
        }

        setSimLogs((prev) => [...prev, { text: step.text, role: step.speaker }]);

        if (step.toolCall) {
            // Execute tool on real server
            const toolName = step.toolCall.name;
            const toolArgs = { ...step.toolCall.args };

            // Replace placeholder with actual created incident ID
            if (toolArgs.incident_id === "__CURRENT_INCIDENT__" && currentIncidentId) {
                toolArgs.incident_id = currentIncidentId;
            }

            const t0 = Date.now();
            try {
                const res = await fetch("/api/tools/execute", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        session_id: `sim_${selectedScenario.id}`,
                        name: toolName,
                        args: toolArgs,
                    }),
                });
                const data = await res.json();
                const elapsed = Date.now() - t0;

                if (data.result?.incident_id) {
                    setCurrentIncidentId(data.result.incident_id);
                }

                if (onToolExecuted) {
                    onToolExecuted({
                        name: toolName,
                        args: toolArgs,
                        result: data.result,
                        at: new Date().toLocaleTimeString(),
                        ms: elapsed,
                    });
                }

                if (onRefreshIncidents) {
                    onRefreshIncidents();
                }
            } catch (err) {
                console.error("Simulation tool execution error:", err);
            }
        }

        if (step.speaker === "agent") {
            playRadioChirp("close");
        }
    };

    const handleNextStep = () => {
        if (!selectedScenario || !selectedScenario.steps) return;
        const next = currentStepIdx + 1;
        if (next < selectedScenario.steps.length) {
            runStep(next);
        }
    };

    const handleAutoPlay = async () => {
        if (!selectedScenario || !selectedScenario.steps) return;
        setIsPlaying(true);
        setCurrentStepIdx(-1);
        setSimLogs([]);
        setCurrentIncidentId("");

        for (let i = 0; i < selectedScenario.steps.length; i++) {
            await runStep(i);
            const pause = selectedScenario.steps[i].pauseMs || 1200;
            await new Promise((r) => setTimeout(r, pause));
        }

        setIsPlaying(false);
    };

    const handleReset = () => {
        setIsPlaying(false);
        setCurrentStepIdx(-1);
        setSimLogs([]);
        setCurrentIncidentId("");
    };

    if (!selectedScenario) {
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex items-center justify-center text-xs font-mono text-slate-400">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                    <span>Connecting to Autonomous Field Simulation Engine...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/70">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <RadioIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
                            <span>AUTONOMOUS FIELD VOICE SIMULATION STUDIO</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                {scenarios.length} Scenarios
                            </span>
                        </h3>
                        <p className="text-xs text-slate-400">
                            Zero-mic interactive multi-turn voice simulation with live server tool execution
                        </p>
                    </div>
                </div>

                {/* Industrial Noise Generator Controller */}
                <div className="flex items-center gap-3 bg-slate-950 p-1.5 px-3 rounded-lg border border-slate-800">
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${noiseActive ? "bg-amber-400 animate-ping" : "bg-slate-600"}`}></span>
                        🏭 Machinery Noise:
                    </span>
                    <button
                        onClick={toggleNoise}
                        className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ${noiseActive
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : "bg-slate-800 text-slate-400 hover:text-white"
                            }`}
                    >
                        {noiseActive ? "Active (ON)" : "Muted (OFF)"}
                    </button>
                    {noiseActive && (
                        <input
                            type="range"
                            min="0.02"
                            max="0.4"
                            step="0.02"
                            value={noiseVolume}
                            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                            className="w-16 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                    )}
                </div>
            </div>

            {/* Scenario Selector Ribbon */}
            <div className="p-3 bg-slate-950/40 border-b border-slate-800 flex gap-2 overflow-x-auto">
                {scenarios.map((s) => {
                    const isSelected = selectedScenario?.id === s.id;
                    return (
                        <button
                            key={s.id}
                            onClick={() => {
                                setSelectedScenarioId(s.id);
                                handleReset();
                            }}
                            className={`px-3 py-2 rounded-lg text-left whitespace-nowrap transition-all border ${isSelected
                                ? "bg-indigo-950/80 border-indigo-500/60 text-white shadow-md shadow-indigo-500/10"
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs text-white">{s.title}</span>
                                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-800 text-indigo-300">
                                    {s.severityBadge}
                                </span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{s.category}</div>
                        </button>
                    );
                })}
            </div>

            {/* Simulation Playback Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 flex-1">
                {/* Transcript & Conversation Log */}
                <div className="lg:col-span-2 p-5 border-r border-slate-800 space-y-3 min-h-[340px] max-h-[460px] overflow-y-auto bg-slate-950/60">
                    <div className="text-xs text-slate-400 pb-2 border-b border-slate-800/80 flex items-center justify-between">
                        <span>{selectedScenario?.description ?? "Select a scenario to preview"}</span>
                        <span className="font-mono text-[10px] text-slate-500">
                            Step {currentStepIdx + 1} of {selectedScenario?.steps?.length ?? 0}
                        </span>
                    </div>

                    {simLogs.length === 0 ? (
                        <div className="py-16 text-center text-slate-500 text-sm">
                            Click <strong className="text-indigo-400">"Auto Play Scenario"</strong> or <strong className="text-slate-300">"Next Step"</strong> below to begin the voice simulation.
                        </div>
                    ) : (
                        simLogs.map((log, i) => {
                            if (log.role === "worker") {
                                return (
                                    <div key={i} className="flex gap-2.5 items-start">
                                        <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                            👷
                                        </div>
                                        <div className="bg-slate-800/90 text-slate-200 px-3.5 py-2.5 rounded-xl rounded-tl-none text-xs border border-slate-700/80 max-w-xl">
                                            <div className="text-[10px] font-mono text-amber-400 mb-0.5">Field Worker (Spoken Audio)</div>
                                            {log.text}
                                        </div>
                                    </div>
                                );
                            } else if (log.role === "agent") {
                                return (
                                    <div key={i} className="flex gap-2.5 items-start justify-end">
                                        <div className="bg-indigo-950/80 text-indigo-100 px-3.5 py-2.5 rounded-xl rounded-tr-none text-xs border border-indigo-700/80 max-w-xl text-right">
                                            <div className="text-[10px] font-mono text-cyan-300 mb-0.5">SiteSpeak Agent (Universal-3 Pro + Voice)</div>
                                            {log.text}
                                        </div>
                                        <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                            ⚡
                                        </div>
                                    </div>
                                );
                            } else {
                                return (
                                    <div key={i} className="my-1.5 px-3 py-1.5 rounded bg-slate-900/90 border border-slate-800 flex items-center gap-2 text-[11px] font-mono text-slate-400">
                                        <span className="text-emerald-400">⚡ [SERVER TOOL CALL]</span>
                                        <span>{log.text}</span>
                                    </div>
                                );
                            }
                        })
                    )}
                </div>

                {/* Scenario Controls & Telemetry */}
                <div className="p-5 flex flex-col justify-between bg-slate-950/90">
                    <div>
                        <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300 mb-3">
                            Playback Controls
                        </h4>
                        <div className="space-y-2">
                            <button
                                onClick={handleAutoPlay}
                                disabled={isPlaying}
                                className={`w-full py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${isPlaying
                                    ? "bg-indigo-600/50 text-indigo-200 cursor-not-allowed"
                                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
                                    }`}
                            >
                                <span>▶️ Auto Play Scenario</span>
                            </button>

                            <button
                                onClick={handleNextStep}
                                disabled={isPlaying || !selectedScenario?.steps || currentStepIdx >= selectedScenario.steps.length - 1}
                                className="w-full py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all disabled:opacity-50"
                            >
                                ⏭️ Next Turn / Step
                            </button>

                            <button
                                onClick={handleReset}
                                className="w-full py-2 rounded-lg text-xs font-mono text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition-all"
                            >
                                ↺ Reset Simulation
                            </button>
                        </div>

                        {/* Scenario Highlights */}
                        <div className="mt-6 p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
                            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                                Architecture Validated:
                            </div>
                            <div className="text-xs text-slate-300 space-y-1 font-mono text-[11px]">
                                <div className="text-emerald-400">✓ VAD Barge-in simulation</div>
                                <div className="text-emerald-400">✓ Real SQLite tool persistence</div>
                                <div className="text-emerald-400">✓ OSHA standard classification</div>
                                <div className="text-emerald-400">✓ Live supervisor audit stream</div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 font-mono text-center">
                        AssemblyAI Voice Agent API &bull; Universal-3 Pro
                    </div>
                </div>
            </div>
        </div>
    );
};
