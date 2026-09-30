import React, { useState } from "react";
import { TerminalIcon, ZapIcon, CheckCircleIcon, ClockIcon } from "./Icons";
import { ToolEvent } from "../hooks/useAgentSession";

interface ToolPipelineFeedProps {
    toolEvents: ToolEvent[];
}

export function ToolPipelineFeed({ toolEvents }: ToolPipelineFeedProps) {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const getToolColor = (name: string) => {
        switch (name) {
            case "create_incident_draft":
                return "var(--accent-amber)";
            case "update_incident":
                return "var(--accent-cyan)";
            case "add_followup":
                return "var(--accent-violet)";
            case "file_incident":
                return "var(--accent-emerald)";
            case "lookup_site":
                return "#38bdf8";
            default:
                return "var(--text-muted)";
        }
    };

    const formatArgsChips = (name: string, args: Record<string, any>) => {
        if (!args || typeof args !== "object") return null;
        const keys = Object.keys(args);
        if (keys.length === 0) return null;

        return (
            <div className="tool-params-chips">
                {keys.map((k) => {
                    const val = args[k];
                    if (val === undefined || val === null || val === "") return null;
                    const displayVal = typeof val === "object" ? JSON.stringify(val) : String(val);
                    return (
                        <span key={k} className="tool-param-chip">
                            <strong>{k}:</strong> {displayVal}
                        </span>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="glass-card" id="tool-pipeline-container">
            <div className="glass-card-header">
                <div className="card-title-group">
                    <TerminalIcon size={18} style={{ color: "var(--accent-indigo)" }} />
                    <h2 className="card-title">Live Tool Pipeline</h2>
                    <span className="card-badge">{toolEvents.length} executed</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                    JSON-Schema Tools
                </div>
            </div>

            <div className="glass-card-body">
                {toolEvents.length === 0 ? (
                    <div className="transcript-empty" style={{ minHeight: 280 }}>
                        <div className="transcript-empty-icon">
                            <ZapIcon size={24} style={{ color: "var(--accent-indigo)" }} />
                        </div>
                        <h3 style={{ fontSize: 16, fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
                            Awaiting Tool Invocations
                        </h3>
                        <p style={{ fontSize: 13, maxWidth: 360, lineHeight: 1.5 }}>
                            As you speak, the agent triggers server functions like{" "}
                            <code>create_incident_draft</code>, <code>update_incident</code>, and{" "}
                            <code>file_incident</code> in real-time.
                        </p>
                    </div>
                ) : (
                    <div className="tool-feed-list">
                        {toolEvents.map((t, idx) => {
                            const isExpanded = expandedIndex === idx;
                            const color = getToolColor(t.name);
                            return (
                                <div key={idx} className="tool-pipeline-item">
                                    <div className="tool-item-header">
                                        <div className="tool-title-row">
                                            <span
                                                className="tool-icon-pill"
                                                style={{ color, borderColor: color }}
                                            >
                                                <ZapIcon size={14} />
                                            </span>
                                            <span className="tool-fn-name">{t.name}</span>
                                        </div>
                                        <div className="tool-meta-right">
                                            {t.ms !== undefined ? (
                                                <span className="tool-latency-pill">{t.ms}ms</span>
                                            ) : (
                                                <span
                                                    className="tool-latency-pill"
                                                    style={{ color: "var(--accent-amber)" }}
                                                >
                                                    running…
                                                </span>
                                            )}
                                            <span className="tool-timestamp">{t.at}</span>
                                        </div>
                                    </div>

                                    {/* High level chips for readability */}
                                    {formatArgsChips(t.name, t.args)}

                                    {/* Toggle raw JSON */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                                        <button
                                            className="action-btn-sm"
                                            style={{ fontSize: 11, padding: "2px 8px" }}
                                            onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                                        >
                                            {isExpanded ? "Hide raw JSON" : "Inspect payload"}
                                        </button>

                                        {t.result && (
                                            <span style={{ fontSize: 11, color: "var(--accent-emerald)", display: "flex", alignItems: "center", gap: 4 }}>
                                                <CheckCircleIcon size={12} />
                                                <span>Success</span>
                                            </span>
                                        )}
                                    </div>

                                    {isExpanded && (
                                        <div style={{ marginTop: 8 }}>
                                            <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 2 }}>ARGUMENTS:</div>
                                            <pre className="tool-json-pre">
                                                {JSON.stringify(t.args, null, 2)}
                                            </pre>
                                            {t.result && (
                                                <div className="tool-result-box">
                                                    <div style={{ fontSize: 10, color: "var(--accent-emerald)", marginBottom: 2, marginTop: 4 }}>RESULT:</div>
                                                    <pre className="tool-json-pre">
                                                        {JSON.stringify(t.result, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
