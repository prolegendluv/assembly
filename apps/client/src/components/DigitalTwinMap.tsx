import React, { useState, useEffect } from "react";
import { Incident, EmergencyEquipment, EmergencyBroadcast } from "../types";
import {
    ShieldAlertIcon,
    AlertTriangleIcon,
    CheckCircleIcon,
    RadioIcon,
    ActivityIcon,
} from "./Icons";

interface DigitalTwinMapProps {
    incidents: Incident[];
    equipment: EmergencyEquipment[];
    activeBroadcast?: EmergencyBroadcast | null;
    selectedZone?: string | null;
    onSelectZone?: (zone: string) => void;
}

export interface ZoneLayout {
    id: string;
    label: string;
    description: string;
    x: number;
    y: number;
    w: number;
    h: number;
    hazardType?: string;
    evacTarget: { x: number; y: number };
}

export interface SiteItem {
    site_id: string;
    label: string;
    zones: string[];
    schematic: ZoneLayout[];
}

export const DigitalTwinMap: React.FC<DigitalTwinMapProps> = ({
    incidents,
    equipment,
    activeBroadcast,
    selectedZone,
    onSelectZone,
}) => {
    const [sites, setSites] = useState<SiteItem[]>([]);
    const [currentSiteId, setCurrentSiteId] = useState<string>("north-yard");
    const [showEquipment, setShowEquipment] = useState(true);
    const [showEvacPaths, setShowEvacPaths] = useState(true);
    const [hoveredZone, setHoveredZone] = useState<ZoneLayout | null>(null);

    useEffect(() => {
        let mounted = true;
        fetch("/api/sites")
            .then((r) => r.json())
            .then((data) => {
                if (!mounted) return;
                if (data.sites && Array.isArray(data.sites) && data.sites.length > 0) {
                    setSites(data.sites);
                    if (!data.sites.some((s: SiteItem) => s.site_id === currentSiteId)) {
                        setCurrentSiteId(data.sites[0].site_id);
                    }
                }
            })
            .catch((err) => console.error("Failed to load sites:", err));

        return () => {
            mounted = false;
        };
    }, []);

    const currentSiteObj = sites.find((s) => s.site_id === currentSiteId) || sites[0];
    const zones: ZoneLayout[] = currentSiteObj?.schematic || [];

    const getZoneIncidents = (zoneId: string) => {
        return incidents.filter((i) => {
            return i.site_id === currentSiteId && i.zone.toLowerCase().includes(zoneId.toLowerCase());
        });
    };

    const getZoneEquipment = (zoneId: string) => {
        return equipment.filter((eq) => {
            return eq.site_id === currentSiteId && eq.zone.toLowerCase().includes(zoneId.toLowerCase());
        });
    };

    const isZoneEmergency = (zoneId: string) => {
        if (!activeBroadcast || activeBroadcast.status !== "active") return false;
        if (activeBroadcast.zone === "All Zones") return true;
        return activeBroadcast.zone.toLowerCase().includes(zoneId.toLowerCase());
    };

    return (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm flex flex-col">
            {/* Top Toolbar */}
            <div className="px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/60">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <ActivityIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
                            <span>DIGITAL TWIN SAFETY SCHEMATIC</span>
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Real-Time V2
                            </span>
                        </h3>
                        <p className="text-xs text-slate-400">Live spatial hazard pins, safety equipment & evacuation corridors</p>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                    {/* Site Switcher from Database */}
                    <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-medium">
                        {sites.map((s) => (
                            <button
                                key={s.site_id}
                                onClick={() => setCurrentSiteId(s.site_id)}
                                className={`px-3 py-1.5 rounded-md transition-all ${currentSiteId === s.site_id
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                                    : "text-slate-400 hover:text-slate-200"
                                    }`}
                            >
                                {s.site_id.includes("north") || s.label.toLowerCase().includes("yard") ? "🏗️ " : "🏢 "}
                                {s.label}
                            </button>
                        ))}
                    </div>

                    {/* Layer Toggles */}
                    <button
                        onClick={() => setShowEquipment(!showEquipment)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-all ${showEquipment
                            ? "bg-slate-800 text-slate-200 border-slate-700"
                            : "bg-slate-900 text-slate-500 border-slate-800"
                            }`}
                        title="Toggle safety equipment layer"
                    >
                        🧯 Equipment
                    </button>
                    <button
                        onClick={() => setShowEvacPaths(!showEvacPaths)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-all ${showEvacPaths
                            ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                            : "bg-slate-900 text-slate-500 border-slate-800"
                            }`}
                        title="Toggle evacuation routes"
                    >
                        🏃 Evacuation
                    </button>
                </div>
            </div>

            {/* Map Canvas */}
            <div className="relative p-4 bg-slate-950/80 flex items-center justify-center overflow-auto min-h-[380px]">
                <svg
                    viewBox="0 0 660 480"
                    className="w-full max-w-[660px] h-auto select-none"
                    style={{ filter: "drop-shadow(0 4px 20px rgba(0,0,0,0.5))" }}
                >
                    <defs>
                        {/* Grid Pattern */}
                        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.75" />
                        </pattern>
                        {/* Striped Danger Pattern for Emergencies */}
                        <pattern id="danger-stripes" width="16" height="16" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                            <line x1="0" y1="0" x2="0" y2="16" stroke="#ef4444" strokeWidth="6" strokeOpacity="0.3" />
                        </pattern>
                        {/* Radial Glow Filters */}
                        <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="6" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>

                    {/* Background Grid */}
                    <rect width="660" height="480" fill="#0b0f17" rx="8" />
                    <rect width="660" height="480" fill="url(#grid)" rx="8" />

                    {/* Site Boundary Perimeter */}
                    <rect
                        x="20"
                        y="20"
                        width="620"
                        height="440"
                        fill="none"
                        stroke="#334155"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                        rx="6"
                    />

                    {/* Assembly / Evacuation Target Zone */}
                    <g transform="translate(360, 425)">
                        <circle r="18" fill="#10b981" fillOpacity="0.2" stroke="#10b981" strokeWidth="1.5" />
                        <circle r="10" fill="#10b981" fillOpacity="0.4" />
                        <text x="0" y="4" textAnchor="middle" fill="#a7f3d0" fontSize="9" fontWeight="bold" fontFamily="monospace">
                            EVAC
                        </text>
                        <text x="0" y="28" textAnchor="middle" fill="#6ee7b7" fontSize="9" fontFamily="sans-serif">
                            Primary Muster Point
                        </text>
                    </g>

                    {/* Evacuation Paths */}
                    {showEvacPaths &&
                        zones.map((z) => (
                            <line
                                key={`evac-${z.id}`}
                                x1={z.x + z.w / 2}
                                y1={z.y + z.h / 2}
                                x2={z.evacTarget.x}
                                y2={z.evacTarget.y}
                                stroke="#10b981"
                                strokeWidth="1.25"
                                strokeDasharray="5 5"
                                strokeOpacity="0.35"
                            />
                        ))}

                    {/* Interactive Zones */}
                    {zones.map((z) => {
                        const zIncidents = getZoneIncidents(z.id);
                        const zEquipment = getZoneEquipment(z.id);
                        const hasCritical = zIncidents.some((i) => i.severity === "critical");
                        const hasHigh = zIncidents.some((i) => i.severity === "high");
                        const isEmergency = isZoneEmergency(z.id);
                        const isSelected = selectedZone?.toLowerCase() === z.id.toLowerCase();

                        let strokeColor = "#334155";
                        let fillColor = "#111827";
                        let fillOpacity = "0.7";

                        if (isEmergency) {
                            strokeColor = "#ef4444";
                            fillColor = "url(#danger-stripes)";
                            fillOpacity = "0.9";
                        } else if (hasCritical) {
                            strokeColor = "#ef4444";
                            fillColor = "#450a0a";
                            fillOpacity = "0.6";
                        } else if (hasHigh) {
                            strokeColor = "#f59e0b";
                            fillColor = "#451a03";
                            fillOpacity = "0.5";
                        } else if (zIncidents.length > 0) {
                            strokeColor = "#3b82f6";
                            fillColor = "#172554";
                            fillOpacity = "0.4";
                        }

                        if (isSelected) {
                            strokeColor = "#38bdf8";
                        }

                        return (
                            <g
                                key={z.id}
                                className="cursor-pointer transition-all duration-200"
                                onClick={() => onSelectZone && onSelectZone(z.id)}
                                onMouseEnter={() => setHoveredZone(z)}
                                onMouseLeave={() => setHoveredZone(null)}
                            >
                                {/* Zone Base Box */}
                                <rect
                                    x={z.x}
                                    y={z.y}
                                    width={z.w}
                                    height={z.h}
                                    fill={fillColor}
                                    fillOpacity={fillOpacity}
                                    stroke={strokeColor}
                                    strokeWidth={isEmergency || isSelected ? 2.5 : 1.25}
                                    rx="6"
                                />

                                {/* Emergency Warning Pulse */}
                                {isEmergency && (
                                    <circle
                                        cx={z.x + z.w / 2}
                                        cy={z.y + z.h / 2}
                                        r="35"
                                        fill="none"
                                        stroke="#ef4444"
                                        strokeWidth="2"
                                        strokeDasharray="4 2"
                                        className="animate-ping"
                                    />
                                )}

                                {/* Zone Header Label */}
                                <text
                                    x={z.x + 10}
                                    y={z.y + 20}
                                    fill={isEmergency ? "#fca5a5" : "#e2e8f0"}
                                    fontSize="11"
                                    fontWeight="bold"
                                    fontFamily="sans-serif"
                                >
                                    {z.label}
                                </text>

                                <text
                                    x={z.x + 10}
                                    y={z.y + 34}
                                    fill="#64748b"
                                    fontSize="8.5"
                                    fontFamily="sans-serif"
                                >
                                    {z.description.slice(0, 32)}
                                </text>

                                {/* Active Incidents Badge */}
                                {zIncidents.length > 0 && (
                                    <g transform={`translate(${z.x + z.w - 32}, ${z.y + 8})`}>
                                        <rect
                                            width="24"
                                            height="18"
                                            rx="4"
                                            fill={hasCritical ? "#ef4444" : hasHigh ? "#f59e0b" : "#3b82f6"}
                                        />
                                        <text
                                            x="12"
                                            y="13"
                                            textAnchor="middle"
                                            fill="#ffffff"
                                            fontSize="10"
                                            fontWeight="bold"
                                            fontFamily="monospace"
                                        >
                                            {zIncidents.length}
                                        </text>
                                    </g>
                                )}

                                {/* Equipment Markers inside Zone */}
                                {showEquipment &&
                                    zEquipment.map((eq, idx) => {
                                        const eqX = z.x + 14 + idx * 28;
                                        const eqY = z.y + z.h - 18;
                                        const iconMap: Record<string, string> = {
                                            spill_kit: "🛢️",
                                            eyewash_station: "🚿",
                                            aed_defibrillator: "⚡",
                                            fire_extinguisher: "🧯",
                                            first_aid_box: "🩹",
                                        };
                                        return (
                                            <g key={eq.id} transform={`translate(${eqX}, ${eqY})`}>
                                                <circle r="9" fill="#1e293b" stroke="#475569" strokeWidth="0.75" />
                                                <text x="0" y="3.5" textAnchor="middle" fontSize="10">
                                                    {iconMap[eq.equipment_type] || "⚙️"}
                                                </text>
                                            </g>
                                        );
                                    })}
                            </g>
                        );
                    })}

                    {/* Site Compass / Scale */}
                    <g transform="translate(605, 45)">
                        <circle r="14" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                        <path d="M 0 -10 L 4 3 L 0 0 L -4 3 Z" fill="#ef4444" />
                        <text x="0" y="-12" textAnchor="middle" fill="#ef4444" fontSize="7" fontWeight="bold">N</text>
                    </g>
                </svg>
            </div>

            {/* Hovered Zone Details / Inspector Bar */}
            <div className="px-5 py-2.5 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400">
                {hoveredZone ? (
                    <div className="flex items-center gap-4">
                        <span className="font-semibold text-slate-200">
                            📍 {hoveredZone.label}
                        </span>
                        <span>{hoveredZone.description}</span>
                        <span className="font-mono text-amber-400">
                            {getZoneIncidents(hoveredZone.id).length} active reports
                        </span>
                        <span className="font-mono text-emerald-400">
                            {getZoneEquipment(hoveredZone.id).length} safety equipment units
                        </span>
                    </div>
                ) : (
                    <div className="flex items-center gap-4">
                        <span className="text-slate-500">
                            💡 Hover or click any bay/aisle on the schematic to inspect live incidents & equipment.
                        </span>
                    </div>
                )}

                {/* Legend */}
                <div className="flex items-center gap-3 font-mono text-[11px]">
                    <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                        Critical
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                        High
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                        Standard
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                        Evac Station
                    </span>
                </div>
            </div>
        </div>
    );
};
