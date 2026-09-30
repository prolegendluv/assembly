import React from "react";
import { ShieldAlertIcon, RadioIcon, ActivityIcon, AlertTriangleIcon, LayersIcon } from "./Icons";

export type ActiveAppView = "field" | "map" | "dash" | "hazmat" | "simulation";

interface HeaderProps {
    view: ActiveAppView;
    setView: (v: ActiveAppView) => void;
    status: "idle" | "connecting" | "live" | "error";
    sessionId?: string;
    duration?: number;
    incidentCount?: number;
    activeAlertCount?: number;
    onRefresh?: () => void;
}

export function Header({
    view,
    setView,
    status,
    sessionId,
    duration = 0,
    incidentCount = 0,
    activeAlertCount = 0,
    onRefresh,
}: HeaderProps) {
    const formatDuration = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s < 10 ? "0" : ""}${s}`;
    };

    return (
        <header className="app-header">
            <div className="brand-section">
                <div className="brand-icon-box">
                    <ShieldAlertIcon size={24} />
                </div>
                <div>
                    <div className="brand-title">
                        SiteSpeak <span className="brand-tag">2.0</span>
                    </div>
                    <div className="brand-subtitle">
                        <span>Autonomous Field Safety Companion</span>
                        <span>•</span>
                        <span>AssemblyAI Voice Agent API</span>
                    </div>
                </div>
            </div>

            <div className="header-actions">
                <nav className="nav-tabs" role="tablist">
                    <button
                        className={`nav-tab-btn ${view === "field" ? "active" : ""}`}
                        onClick={() => setView("field")}
                        id="nav-tab-field"
                        role="tab"
                        aria-selected={view === "field"}
                        title="Voice reporting console with real-time turn-taking"
                    >
                        <RadioIcon size={16} />
                        <span>Field Console</span>
                    </button>

                    <button
                        className={`nav-tab-btn ${view === "map" ? "active" : ""}`}
                        onClick={() => {
                            setView("map");
                            if (onRefresh) onRefresh();
                        }}
                        id="nav-tab-map"
                        role="tab"
                        aria-selected={view === "map"}
                        title="Spatial 2D/3D Digital Twin safety schematic"
                    >
                        <LayersIcon size={16} />
                        <span>Digital Twin Map</span>
                    </button>

                    <button
                        className={`nav-tab-btn ${view === "dash" ? "active" : ""}`}
                        onClick={() => {
                            setView("dash");
                            if (onRefresh) onRefresh();
                        }}
                        id="nav-tab-supervisor"
                        role="tab"
                        aria-selected={view === "dash"}
                        title="Supervisor command center, tool audit, and OSHA records"
                    >
                        <ActivityIcon size={16} />
                        <span>Supervisor Command</span>
                        {incidentCount > 0 && (
                            <span className="counter-badge">{incidentCount}</span>
                        )}
                    </button>

                    <button
                        className={`nav-tab-btn ${view === "hazmat" ? "active" : ""}`}
                        onClick={() => setView("hazmat")}
                        id="nav-tab-hazmat"
                        role="tab"
                        aria-selected={view === "hazmat"}
                        title="HAZMAT safety data sheets & PPE compass"
                    >
                        <AlertTriangleIcon size={16} />
                        <span>HAZMAT / SDS</span>
                    </button>

                    <button
                        className={`nav-tab-btn ${view === "simulation" ? "active" : ""}`}
                        onClick={() => setView("simulation")}
                        id="nav-tab-simulation"
                        role="tab"
                        aria-selected={view === "simulation"}
                        title="Autonomous zero-mic voice simulation studio"
                    >
                        <span>🎮</span>
                        <span>Simulation Studio</span>
                    </button>
                </nav>

                {activeAlertCount > 0 && (
                    <div className="status-pill" style={{ background: "rgba(239, 68, 68, 0.2)", borderColor: "#ef4444", color: "#fca5a5" }}>
                        <span className="status-dot error animate-ping" />
                        <span style={{ fontWeight: "bold" }}>{activeAlertCount} ALERTS ACTIVE</span>
                    </div>
                )}

                <div className="status-pill" title={`Status: ${status}`}>
                    <span className={`status-dot ${status}`} />
                    <span style={{ textTransform: "capitalize" }}>{status}</span>
                    {status === "live" && (
                        <span style={{ color: "var(--accent-emerald)", marginLeft: 2 }}>
                            {formatDuration(duration)}
                        </span>
                    )}
                    {sessionId && (
                        <span style={{ color: "var(--text-dim)", fontSize: 11 }}>
                            · {sessionId.slice(0, 6)}
                        </span>
                    )}
                </div>
            </div>
        </header>
    );
}
