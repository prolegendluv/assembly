import React, { useState } from "react";
import { TerminalIcon, RefreshCwIcon, CheckCircleIcon, ZapIcon, ClockIcon } from "./Icons";
import { ToolAuditItem } from "../types";

interface ToolAuditLogProps {
    audit: ToolAuditItem[];
    onRefresh: () => void;
}

export function ToolAuditLog({ audit, onRefresh }: ToolAuditLogProps) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [filterTool, setFilterTool] = useState<string>("all");
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await onRefresh();
        } finally {
            setTimeout(() => setIsRefreshing(false), 500);
        }
    };

    const toolNames = Array.from(new Set(audit.map((a) => a.tool)));

    const filteredAudit = audit.filter(
        (a) => filterTool === "all" || a.tool === filterTool
    );

    const avgMs =
        audit.length > 0
            ? Math.round(audit.reduce((acc, a) => acc + (a.ms || 0), 0) / audit.length)
            : 0;

    return (
        <div className="glass-card" id="tool-audit-container" style={{ marginTop: 24 }}>
            <div className="glass-card-header">
                <div className="card-title-group">
                    <TerminalIcon size={18} style={{ color: "var(--accent-cyan)" }} />
                    <h2 className="card-title">Server Tool Execution Audit</h2>
                    <span className="card-badge">{audit.length} entries</span>
                    {avgMs > 0 && (
                        <span className="tool-latency-pill">Avg: {avgMs}ms</span>
                    )}
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <select
                        value={filterTool}
                        onChange={(e) => setFilterTool(e.target.value)}
                        style={{
                            background: "rgba(255, 255, 255, 0.05)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "var(--radius-sm)",
                            color: "var(--text-main)",
                            fontSize: 12,
                            padding: "4px 8px",
                            outline: "none",
                        }}
                    >
                        <option value="all">All Tools</option>
                        {toolNames.map((t) => (
                            <option key={t} value={t}>
                                {t}
                            </option>
                        ))}
                    </select>

                    <button
                        className="action-btn-sm"
                        onClick={handleRefresh}
                        title="Refresh audit log"
                        disabled={isRefreshing}
                    >
                        <RefreshCwIcon
                            size={14}
                            style={{
                                transform: isRefreshing ? "rotate(180deg)" : "none",
                                transition: "transform 0.5s ease",
                            }}
                        />
                        <span>{isRefreshing ? "Refreshing…" : "Refresh"}</span>
                    </button>
                </div>
            </div>

            <div className="glass-card-body">
                {filteredAudit.length === 0 ? (
                    <div className="transcript-empty" style={{ minHeight: 180 }}>
                        <p>No audit entries match filter.</p>
                    </div>
                ) : (
                    <div className="audit-list">
                        {filteredAudit.map((e) => {
                            const isExpanded = expandedId === e.id;
                            let parsedArgs: any = e.args;
                            let parsedResult: any = e.result;
                            try {
                                parsedArgs = JSON.parse(e.args);
                            } catch { }
                            try {
                                parsedResult = JSON.parse(e.result);
                            } catch { }

                            return (
                                <div key={e.id} className="audit-entry">
                                    <div className="audit-entry-top">
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <span
                                                className="tool-fn-name"
                                                style={{
                                                    color: "var(--accent-indigo)",
                                                    background: "rgba(99, 102, 241, 0.1)",
                                                    padding: "1px 6px",
                                                    borderRadius: 4,
                                                }}
                                            >
                                                {e.tool}
                                            </span>
                                            {e.session_id && (
                                                <span style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                                                    sess: {e.session_id.slice(0, 8)}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <span className="tool-latency-pill">{e.ms}ms</span>
                                            <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                                                {e.at}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                                        <div style={{ fontSize: 12, color: "#cbd5e1" }}>
                                            {typeof parsedArgs === "object" && parsedArgs.category && (
                                                <span>Category: <strong>{parsedArgs.category}</strong> </span>
                                            )}
                                            {typeof parsedArgs === "object" && parsedArgs.zone && (
                                                <span>Zone: <strong>{parsedArgs.zone}</strong> </span>
                                            )}
                                            {typeof parsedArgs === "object" && parsedArgs.action && (
                                                <span>Action: <strong>{parsedArgs.action}</strong> </span>
                                            )}
                                            {typeof parsedArgs === "object" && parsedArgs.incident_id && (
                                                <span style={{ color: "var(--text-dim)", fontSize: 11 }}>[{parsedArgs.incident_id}]</span>
                                            )}
                                        </div>

                                        <button
                                            className="action-btn-sm"
                                            style={{ fontSize: 10, padding: "2px 6px" }}
                                            onClick={() => setExpandedId(isExpanded ? null : e.id)}
                                        >
                                            {isExpanded ? "Hide" : "Inspect"}
                                        </button>
                                    </div>

                                    {isExpanded && (
                                        <div style={{ marginTop: 8 }}>
                                            <div style={{ fontSize: 10, color: "var(--text-dim)" }}>ARGS:</div>
                                            <pre className="tool-json-pre">
                                                {JSON.stringify(parsedArgs, null, 2)}
                                            </pre>
                                            <div style={{ fontSize: 10, color: "var(--accent-emerald)", marginTop: 4 }}>RESULT:</div>
                                            <pre className="tool-json-pre" style={{ borderColor: "rgba(16, 185, 129, 0.3)" }}>
                                                {JSON.stringify(parsedResult, null, 2)}
                                            </pre>
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
