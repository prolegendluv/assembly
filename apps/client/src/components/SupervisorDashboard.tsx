import React, { useState } from "react";
import {
    ShieldAlertIcon,
    AlertTriangleIcon,
    CheckCircleIcon,
    ActivityIcon,
    SearchIcon,
    MapPinIcon,
    ClockIcon,
    XIcon,
    CopyIcon,
    CheckIcon,
    ZapIcon,
    LayersIcon,
} from "./Icons";
import { Incident, Followup, StatsResponse } from "../types";

interface SupervisorDashboardProps {
    incidents: Incident[];
    stats: StatsResponse | null;
    onRefresh: () => void;
    onOpenOshaModal?: (incidentId: string) => void;
}

export function SupervisorDashboard({
    incidents,
    stats,
    onRefresh,
    onOpenOshaModal,
}: SupervisorDashboardProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [filterOshaOnly, setFilterOshaOnly] = useState<boolean>(false);
    const [activeIncident, setActiveIncident] = useState<Incident | null>(null);
    const [followups, setFollowups] = useState<Followup[]>([]);
    const [loadingFollowups, setLoadingFollowups] = useState(false);
    const [copiedJson, setCopiedJson] = useState(false);

    // Compute stats if stats prop isn't fully loaded
    const totalCount = stats?.total ?? incidents.length;
    const filedCount = stats?.filed ?? incidents.filter((i) => i.status === "filed").length;
    const criticalHighCount = incidents.filter(
        (i) => i.severity === "critical" || i.severity === "high"
    ).length;
    const oshaCount = stats?.oshaCount ?? incidents.filter((i) => i.osha_reportable === 1 || i.injuries_count > 0).length;

    // Severity mapping
    const sevCounts: Record<string, number> = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
    };
    if (stats?.bySeverity) {
        for (const item of stats.bySeverity) {
            sevCounts[item.severity] = item.c;
        }
    } else {
        for (const inc of incidents) {
            sevCounts[inc.severity] = (sevCounts[inc.severity] ?? 0) + 1;
        }
    }

    const openIncidentModal = async (inc: Incident) => {
        setActiveIncident(inc);
        setLoadingFollowups(true);
        try {
            const res = await fetch(`/api/incidents/${inc.id}`).then((r) => r.json());
            setFollowups(res.followups ?? []);
        } catch {
            setFollowups([]);
        } finally {
            setLoadingFollowups(false);
        }
    };

    const handleToggleFollowup = async (fId: string) => {
        try {
            const res = await fetch(`/api/followups/${fId}/toggle`, { method: "PATCH" });
            const data = await res.json();
            setFollowups((prev) =>
                prev.map((f) => (f.id === fId ? { ...f, done: data.done } : f))
            );
            onRefresh();
        } catch (e) {
            console.error("Failed to toggle followup:", e);
        }
    };

    const handleCopyJson = (data: any) => {
        navigator.clipboard.writeText(JSON.stringify(data, null, 2));
        setCopiedJson(true);
        setTimeout(() => setCopiedJson(false), 2000);
    };

    // Filter incidents
    const filteredIncidents = incidents.filter((inc) => {
        const matchesSearch =
            searchTerm === "" ||
            inc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inc.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inc.zone.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inc.site_id.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesSeverity =
            selectedSeverity === "all" || inc.severity === selectedSeverity;

        const matchesStatus =
            selectedStatus === "all" || inc.status === selectedStatus;

        const matchesOsha = !filterOshaOnly || inc.osha_reportable === 1 || inc.injuries_count > 0;

        return matchesSearch && matchesSeverity && matchesStatus && matchesOsha;
    });

    const calcPercent = (count: number) => {
        if (totalCount === 0) return 0;
        return Math.round((count / totalCount) * 100);
    };

    return (
        <div id="supervisor-dashboard-container">
            {/* KPI Cards */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-label">Total Incidents</span>
                        <div
                            className="kpi-icon-wrap"
                            style={{
                                background: "rgba(99, 102, 241, 0.15)",
                                color: "var(--accent-indigo)",
                            }}
                        >
                            <LayersIcon size={18} />
                        </div>
                    </div>
                    <div className="kpi-val">{totalCount}</div>
                    <div className="kpi-footer">Audited in SQLite WAL database</div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-label">Filed & Validated</span>
                        <div
                            className="kpi-icon-wrap"
                            style={{
                                background: "rgba(16, 185, 129, 0.15)",
                                color: "var(--accent-emerald)",
                            }}
                        >
                            <CheckCircleIcon size={18} />
                        </div>
                    </div>
                    <div className="kpi-val" style={{ color: "var(--accent-emerald)" }}>
                        {filedCount}
                    </div>
                    <div className="kpi-footer">
                        {totalCount > 0 ? `${calcPercent(filedCount)}% file completion rate` : "No incidents yet"}
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-label">Critical & High Risk</span>
                        <div
                            className="kpi-icon-wrap"
                            style={{
                                background: "rgba(239, 68, 68, 0.15)",
                                color: "var(--accent-rose)",
                            }}
                        >
                            <AlertTriangleIcon size={18} />
                        </div>
                    </div>
                    <div className="kpi-val" style={{ color: "var(--accent-rose)" }}>
                        {criticalHighCount}
                    </div>
                    <div className="kpi-footer">Requires immediate supervisor signoff</div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-label">OSHA Recordable Form 301</span>
                        <div
                            className="kpi-icon-wrap"
                            style={{
                                background: "rgba(245, 158, 11, 0.15)",
                                color: "var(--accent-amber)",
                            }}
                        >
                            <ShieldAlertIcon size={18} />
                        </div>
                    </div>
                    <div className="kpi-val" style={{ color: "var(--accent-amber)" }}>
                        {oshaCount}
                    </div>
                    <div className="kpi-footer">Mandatory OSHA 1904 compliance</div>
                </div>
            </div>

            {/* Severity Distribution Track */}
            <div className="distrib-section">
                <div className="distrib-title">
                    <span>Facility Severity Distribution</span>
                    <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
                        {totalCount} total categorized
                    </span>
                </div>
                <div className="distrib-track">
                    <div
                        className="distrib-segment"
                        style={{
                            width: `${calcPercent(sevCounts.critical)}%`,
                            background: "var(--accent-rose)",
                        }}
                        title={`Critical: ${sevCounts.critical}`}
                    />
                    <div
                        className="distrib-segment"
                        style={{
                            width: `${calcPercent(sevCounts.high)}%`,
                            background: "var(--accent-amber)",
                        }}
                        title={`High: ${sevCounts.high}`}
                    />
                    <div
                        className="distrib-segment"
                        style={{
                            width: `${calcPercent(sevCounts.medium)}%`,
                            background: "var(--accent-cyan)",
                        }}
                        title={`Medium: ${sevCounts.medium}`}
                    />
                    <div
                        className="distrib-segment"
                        style={{
                            width: `${calcPercent(sevCounts.low)}%`,
                            background: "var(--text-dim)",
                        }}
                        title={`Low: ${sevCounts.low}`}
                    />
                </div>
                <div className="distrib-legend">
                    <div className="legend-item">
                        <span className="legend-color" style={{ background: "var(--accent-rose)" }} />
                        <span>Critical ({sevCounts.critical})</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color" style={{ background: "var(--accent-amber)" }} />
                        <span>High ({sevCounts.high})</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color" style={{ background: "var(--accent-cyan)" }} />
                        <span>Medium ({sevCounts.medium})</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color" style={{ background: "var(--text-dim)" }} />
                        <span>Low ({sevCounts.low})</span>
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="filter-bar">
                <div className="search-input-wrap">
                    <SearchIcon size={16} />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search incidents by location, description, or category…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        id="search-incidents-input"
                    />
                </div>

                <div className="filter-pills">
                    <button
                        className={`filter-pill ${selectedSeverity === "all" ? "active" : ""}`}
                        onClick={() => setSelectedSeverity("all")}
                    >
                        All Severities
                    </button>
                    <button
                        className={`filter-pill ${selectedSeverity === "critical" ? "active" : ""}`}
                        onClick={() => setSelectedSeverity("critical")}
                    >
                        Critical
                    </button>
                    <button
                        className={`filter-pill ${selectedSeverity === "high" ? "active" : ""}`}
                        onClick={() => setSelectedSeverity("high")}
                    >
                        High
                    </button>
                    <button
                        className={`filter-pill ${selectedSeverity === "medium" ? "active" : ""}`}
                        onClick={() => setSelectedSeverity("medium")}
                    >
                        Medium
                    </button>
                    <button
                        className={`filter-pill ${selectedSeverity === "low" ? "active" : ""}`}
                        onClick={() => setSelectedSeverity("low")}
                    >
                        Low
                    </button>
                </div>

                <div className="filter-pills">
                    <button
                        className={`filter-pill ${selectedStatus === "all" ? "active" : ""}`}
                        onClick={() => setSelectedStatus("all")}
                    >
                        All Status
                    </button>
                    <button
                        className={`filter-pill ${selectedStatus === "filed" ? "active" : ""}`}
                        onClick={() => setSelectedStatus("filed")}
                    >
                        Filed
                    </button>
                    <button
                        className={`filter-pill ${selectedStatus === "draft" ? "active" : ""}`}
                        onClick={() => setSelectedStatus("draft")}
                    >
                        Draft
                    </button>
                    <button
                        className={`filter-pill ${filterOshaOnly ? "active" : ""}`}
                        style={filterOshaOnly ? { background: "var(--accent-amber)", color: "#000" } : {}}
                        onClick={() => setFilterOshaOnly(!filterOshaOnly)}
                    >
                        📋 OSHA Only
                    </button>
                </div>
            </div>

            {/* Incidents Card List */}
            <div className="incident-list-grid">
                {filteredIncidents.length === 0 ? (
                    <div className="transcript-empty" style={{ minHeight: 200 }}>
                        <p>No incidents match your current search and filters.</p>
                    </div>
                ) : (
                    filteredIncidents.map((inc) => {
                        const sevClass = `sev-${inc.severity}`;
                        const isOsha = inc.osha_reportable === 1 || inc.injuries_count > 0;
                        return (
                            <div
                                key={inc.id}
                                className={`incident-card ${sevClass}`}
                                onClick={() => openIncidentModal(inc)}
                                role="button"
                                tabIndex={0}
                            >
                                <div className="incident-card-top">
                                    <div className="incident-badge-group">
                                        <span className={`sev-badge ${inc.severity}`}>
                                            {inc.severity}
                                        </span>
                                        <span className={`status-tag ${inc.status}`}>
                                            {inc.status}
                                        </span>
                                        <span className="category-tag">
                                            {inc.category.replace("_", " ")}
                                        </span>
                                        {isOsha && (
                                            <span style={{ fontSize: 10, fontFamily: "monospace", padding: "2px 6px", borderRadius: 4, background: "rgba(245, 158, 11, 0.2)", color: "#fcd34d", border: "1px solid rgba(245, 158, 11, 0.4)" }}>
                                                OSHA-301
                                            </span>
                                        )}
                                    </div>
                                    <div className="location-tag">
                                        <MapPinIcon size={14} />
                                        <span>
                                            {inc.site_id} · <strong>{inc.zone}</strong>
                                        </span>
                                    </div>
                                </div>

                                <div className="incident-desc">{inc.description}</div>

                                <div className="incident-card-foot">
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span>ID: {inc.id}</span>
                                        {inc.injuries_count > 0 && (
                                            <span className="incident-injuries-alert">
                                                🚨 {inc.injuries_count} injured ({inc.injuries_desc || "reported"})
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <ClockIcon size={12} />
                                        <span>
                                            {inc.filed_at ? `Filed ${inc.filed_at}` : inc.created_at}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modal Detail View */}
            {activeIncident && (
                <div
                    className="modal-backdrop"
                    onClick={() => setActiveIncident(null)}
                    role="presentation"
                >
                    <div
                        className="modal-dialog"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-labelledby="modal-incident-title"
                    >
                        <div className="modal-header">
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span className={`sev-badge ${activeIncident.severity}`}>
                                        {activeIncident.severity}
                                    </span>
                                    <span className={`status-tag ${activeIncident.status}`}>
                                        {activeIncident.status}
                                    </span>
                                    <span style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--text-dim)" }}>
                                        {activeIncident.id}
                                    </span>
                                </div>
                                <h2
                                    id="modal-incident-title"
                                    style={{
                                        fontFamily: "var(--font-heading)",
                                        fontSize: 20,
                                        fontWeight: 700,
                                        marginTop: 4,
                                        textTransform: "capitalize",
                                    }}
                                >
                                    {activeIncident.category.replace("_", " ")} Incident Report
                                </h2>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                {onOpenOshaModal && (
                                    <button
                                        onClick={() => onOpenOshaModal(activeIncident.id)}
                                        className="action-btn-sm"
                                        style={{ background: "rgba(245, 158, 11, 0.2)", borderColor: "rgba(245, 158, 11, 0.4)", color: "#fcd34d" }}
                                    >
                                        📋 OSHA 301 Form
                                    </button>
                                )}
                                <button
                                    className="modal-close-btn"
                                    onClick={() => setActiveIncident(null)}
                                    aria-label="Close details"
                                >
                                    <XIcon size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="modal-body">
                            <div className="detail-row">
                                <div className="detail-label">Facility & Zone Location</div>
                                <div className="detail-val" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <MapPinIcon size={16} style={{ color: "var(--accent-amber)" }} />
                                    <span>
                                        Site: <strong>{activeIncident.site_id}</strong> — Zone: <strong>{activeIncident.zone}</strong>
                                    </span>
                                </div>
                            </div>

                            <div className="detail-row">
                                <div className="detail-label">Worker Spoken Narrative</div>
                                <div
                                    style={{
                                        background: "rgba(255, 255, 255, 0.03)",
                                        border: "1px solid var(--border-subtle)",
                                        borderRadius: "var(--radius-sm)",
                                        padding: "12px 14px",
                                        fontSize: 14,
                                        lineHeight: 1.5,
                                    }}
                                >
                                    "{activeIncident.description}"
                                </div>
                            </div>

                            {activeIncident.injuries_count > 0 && (
                                <div className="detail-row">
                                    <div className="detail-label" style={{ color: "var(--accent-rose)" }}>Injuries Noted</div>
                                    <div className="detail-val" style={{ color: "#fca5a5" }}>
                                        Count: {activeIncident.injuries_count} — {activeIncident.injuries_desc || "No medical details given"}
                                    </div>
                                </div>
                            )}

                            <div className="detail-row">
                                <div className="detail-label">Assigned Corrective Follow-ups (Live Toggle)</div>
                                {loadingFollowups ? (
                                    <div style={{ fontSize: 13, color: "var(--text-dim)" }}>Loading followups…</div>
                                ) : followups.length === 0 ? (
                                    <div style={{ fontSize: 13, color: "var(--text-dim)" }}>No corrective actions recorded for this incident.</div>
                                ) : (
                                    followups.map((f) => (
                                        <div
                                            key={f.id}
                                            className="followup-item"
                                            style={{ cursor: "pointer" }}
                                            onClick={() => handleToggleFollowup(f.id)}
                                        >
                                            <input
                                                type="checkbox"
                                                className="followup-checkbox"
                                                checked={Boolean(f.done)}
                                                onChange={() => handleToggleFollowup(f.id)}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 14, fontWeight: 500, textDecoration: f.done ? "line-through" : "none", color: f.done ? "var(--text-dim)" : "#fff" }}>
                                                    {f.action}
                                                </div>
                                                <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>
                                                    Assignee: <strong>{f.assignee_role || "general"}</strong> · Due in: <strong>{f.due_in_hours}h</strong>
                                                    {f.done ? " · ✅ [COMPLETED]" : " · ⏳ [IN PROGRESS]"}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="detail-row" style={{ marginTop: 20 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                    <span className="detail-label" style={{ margin: 0 }}>Raw JSON Schema</span>
                                    <button
                                        className="action-btn-sm"
                                        onClick={() => handleCopyJson({ ...activeIncident, followups })}
                                    >
                                        {copiedJson ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                                        <span>{copiedJson ? "Copied" : "Copy JSON"}</span>
                                    </button>
                                </div>
                                <pre className="tool-json-pre" style={{ maxHeight: 180 }}>
                                    {JSON.stringify({ ...activeIncident, followups }, null, 2)}
                                </pre>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
