import { useEffect, useState } from "react";
import { useAgentSession } from "./hooks/useAgentSession";
import { Header, ActiveAppView } from "./components/Header";
import { VoiceController } from "./components/VoiceController";
import { TranscriptFeed } from "./components/TranscriptFeed";
import { ToolPipelineFeed } from "./components/ToolPipelineFeed";
import { SupervisorDashboard } from "./components/SupervisorDashboard";
import { ToolAuditLog } from "./components/ToolAuditLog";
import { DigitalTwinMap } from "./components/DigitalTwinMap";
import { EmergencyBroadcastBanner } from "./components/EmergencyBroadcastBanner";
import { HazmatQuickReference } from "./components/HazmatQuickReference";
import { SimulationSuite } from "./components/SimulationSuite";
import { OshaReportModal } from "./components/OshaReportModal";
import {
    Incident,
    ToolAuditItem,
    StatsResponse,
    EmergencyEquipment,
    EmergencyBroadcast,
} from "./types";
import { ShieldAlertIcon, CheckCircleIcon } from "./components/Icons";

export default function App() {
    const {
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
    } = useAgentSession();

    const [view, setView] = useState<ActiveAppView>("field");
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [audit, setAudit] = useState<ToolAuditItem[]>([]);
    const [stats, setStats] = useState<StatsResponse | null>(null);
    const [equipment, setEquipment] = useState<EmergencyEquipment[]>([]);
    const [broadcasts, setBroadcasts] = useState<EmergencyBroadcast[]>([]);
    const [activeBroadcast, setActiveBroadcast] = useState<EmergencyBroadcast | null>(null);
    const [selectedOshaIncidentId, setSelectedOshaIncidentId] = useState<string | null>(null);
    const [selectedZone, setSelectedZone] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const refresh = async () => {
        try {
            const [i, a, s, eq, b] = await Promise.all([
                fetch("/api/incidents").then((r) => r.json()),
                fetch("/api/tool-audit?limit=50").then((r) => r.json()),
                fetch("/api/stats").then((r) => r.json()),
                fetch("/api/emergency-equipment").then((r) => r.json()),
                fetch("/api/emergency-broadcasts").then((r) => r.json()),
            ]);
            setIncidents(i.incidents ?? []);
            setAudit(a.events ?? []);
            setStats(s);
            setEquipment(eq.equipment ?? []);
            setBroadcasts(b.broadcasts ?? []);

            const active = (b.broadcasts ?? []).find((x: EmergencyBroadcast) => x.status === "active");
            setActiveBroadcast(active ?? null);
        } catch (e) {
            console.error("Refresh error:", e);
        }
    };

    useEffect(() => {
        refresh();
        const t = setInterval(refresh, 3500);
        return () => clearInterval(t);
    }, []);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    const handleSelectPrompt = (promptText: string) => {
        navigator.clipboard.writeText(promptText);
        showToast(`Copied demo phrase: "${promptText.slice(0, 45)}…"`);
    };

    const handleClearBroadcast = async (broadcastId: string) => {
        try {
            await fetch(`/api/emergency-broadcasts/${broadcastId}/clear`, { method: "POST" });
            showToast("Emergency broadcast cleared by supervisor.");
            refresh();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="app-container">
            {/* Top Navigation Bar */}
            <Header
                view={view}
                setView={setView}
                status={status}
                sessionId={sessionId}
                duration={duration}
                incidentCount={incidents.length}
                activeAlertCount={activeBroadcast ? 1 : 0}
                onRefresh={refresh}
            />

            {/* Emergency Broadcast Alert Banner */}
            <EmergencyBroadcastBanner
                broadcast={activeBroadcast}
                onClearBroadcast={handleClearBroadcast}
            />

            {/* OSHA Form 301 Modal */}
            {selectedOshaIncidentId && (
                <OshaReportModal
                    incidentId={selectedOshaIncidentId}
                    onClose={() => setSelectedOshaIncidentId(null)}
                />
            )}

            {/* Floating Toast Notification */}
            {toastMessage && (
                <div
                    style={{
                        position: "fixed",
                        bottom: 24,
                        right: 24,
                        background: "rgba(15, 23, 42, 0.96)",
                        border: "1px solid var(--accent-cyan)",
                        borderRadius: "var(--radius-md)",
                        padding: "12px 18px",
                        color: "#fff",
                        fontSize: 13,
                        boxShadow: "var(--shadow-glass)",
                        zIndex: 9999,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        animation: "fade-in 0.2s ease",
                    }}
                >
                    <CheckCircleIcon size={16} style={{ color: "var(--accent-cyan)" }} />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Main Application Views */}
            <main>
                {/* 1. Field Console View */}
                {view === "field" && (
                    <div className="view-grid">
                        <section aria-label="Voice Reporting Hub">
                            <VoiceController
                                status={status}
                                audioLevel={audioLevel}
                                error={error}
                                duration={duration}
                                isAgentSpeaking={isAgentSpeaking}
                                sessionId={sessionId}
                                onStart={start}
                                onStop={stop}
                                onSelectPrompt={handleSelectPrompt}
                            />

                            <TranscriptFeed
                                messages={messages}
                                onClear={clearMessages}
                            />
                        </section>

                        <aside aria-label="Tool Pipeline and Live State">
                            <ToolPipelineFeed toolEvents={toolEvents} />

                            <div className="glass-card" style={{ marginTop: 24 }}>
                                <div className="glass-card-header">
                                    <div className="card-title-group">
                                        <ShieldAlertIcon size={18} style={{ color: "var(--accent-amber)" }} />
                                        <h2 className="card-title">Autonomous Safety Engine</h2>
                                    </div>
                                    <span className="card-badge">AssemblyAI Universal-3 Pro</span>
                                </div>
                                <div className="glass-card-body" style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                                    <p style={{ marginBottom: 8 }}>
                                        <strong>10 Client-Side JSON Tools:</strong> SiteSpeak handles real-time site lookup,
                                        SDS HAZMAT protocol assessment, emergency equipment navigation, OSHA compliance scoring,
                                        and facility siren broadcast directly through AssemblyAI Voice Agent turn-taking.
                                    </p>
                                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                                        <span className="tool-param-chip">Universal-3 Pro STT</span>
                                        <span className="tool-param-chip">VAD Barge-in Flush</span>
                                        <span className="tool-param-chip">HAZMAT SDS Protocol</span>
                                        <span className="tool-param-chip">OSHA Form 301</span>
                                        <span className="tool-param-chip">Digital Twin Map</span>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>
                )}

                {/* 2. Digital Twin Schematic View */}
                {view === "map" && (
                    <div className="space-y-6">
                        <DigitalTwinMap
                            incidents={incidents}
                            equipment={equipment}
                            activeBroadcast={activeBroadcast}
                            selectedZone={selectedZone}
                            onSelectZone={(zone) => setSelectedZone(zone)}
                        />

                        {/* Recent Incidents under Selected Zone */}
                        <div className="glass-card">
                            <div className="glass-card-header">
                                <h3 className="card-title">
                                    {selectedZone ? `Active Incidents in ${selectedZone.toUpperCase()}` : "Site Hazards & Active Safety Stations"}
                                </h3>
                                <button
                                    onClick={() => setView("field")}
                                    className="action-btn-sm"
                                    style={{ background: "var(--accent-cyan)", color: "#000", fontWeight: "bold" }}
                                >
                                    🎙️ Report Hazard in Zone
                                </button>
                            </div>
                            <div className="glass-card-body">
                                <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
                                    Select any zone on the digital twin schematic above to cross-reference incident telemetry,
                                    emergency safety equipment (eyewash, spill kits, AEDs), and evacuation corridors.
                                </p>
                                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                                    <div className="kpi-card" style={{ flex: 1, minWidth: 200, padding: 14 }}>
                                        <div className="kpi-label">Active Equipment Mapped</div>
                                        <div className="kpi-val" style={{ fontSize: 22, color: "var(--accent-emerald)" }}>{equipment.length} Units</div>
                                    </div>
                                    <div className="kpi-card" style={{ flex: 1, minWidth: 200, padding: 14 }}>
                                        <div className="kpi-label">Emergency Stations</div>
                                        <div className="kpi-val" style={{ fontSize: 22, color: "var(--accent-amber)" }}>9 Zones</div>
                                    </div>
                                    <div className="kpi-card" style={{ flex: 1, minWidth: 200, padding: 14 }}>
                                        <div className="kpi-label">Evacuation Muster Points</div>
                                        <div className="kpi-val" style={{ fontSize: 22, color: "var(--accent-cyan)" }}>2 Primary</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Supervisor Command View */}
                {view === "dash" && (
                    <div>
                        <SupervisorDashboard
                            incidents={incidents}
                            stats={stats}
                            onRefresh={refresh}
                            onOpenOshaModal={(id) => setSelectedOshaIncidentId(id)}
                        />

                        <ToolAuditLog
                            audit={audit}
                            onRefresh={refresh}
                        />
                    </div>
                )}

                {/* 4. HAZMAT & SDS Compass View */}
                {view === "hazmat" && (
                    <div>
                        <HazmatQuickReference />
                    </div>
                )}

                {/* 5. Voice Simulation Studio View */}
                {view === "simulation" && (
                    <div className="space-y-6">
                        <SimulationSuite
                            onToolExecuted={() => refresh()}
                            onRefreshIncidents={() => refresh()}
                        />
                    </div>
                )}
            </main>

            {/* Application Footer */}
            <footer className="app-footer">
                <div>
                    <strong>SiteSpeak 2.0</strong> — Autonomous Field Safety Companion for AssemblyAI Voice Agent Hackathon (lablab.ai)
                    &bull; Universal-3 Pro STT &bull; 10 Schema Tools &bull; SQLite WAL
                </div>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <span>MIT Licensed</span>
                    <span>•</span>
                    <button
                        onClick={refresh}
                        className="action-btn-sm"
                        style={{ fontSize: 11 }}
                    >
                        Sync Now
                    </button>
                </div>
            </footer>
        </div>
    );
}