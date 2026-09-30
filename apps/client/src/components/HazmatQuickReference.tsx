import React, { useState, useEffect } from "react";
import { HazmatProtocol } from "../types";
import { ShieldAlertIcon, AlertTriangleIcon, CheckCircleIcon } from "./Icons";

interface HazmatQuickReferenceProps {
    onClose?: () => void;
}

export const HazmatQuickReference: React.FC<HazmatQuickReferenceProps> = ({ onClose }) => {
    const [protocols, setProtocols] = useState<HazmatProtocol[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedProtocol, setSelectedProtocol] = useState<HazmatProtocol | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/hazmat-protocols")
            .then((res) => res.json())
            .then((data) => {
                if (data.protocols) {
                    setProtocols(data.protocols);
                    if (data.protocols.length > 0) setSelectedProtocol(data.protocols[0]);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const filtered = protocols.filter(
        (p) =>
            p.chemical_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.un_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.synonyms.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md flex flex-col h-full max-h-[700px]">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <AlertTriangleIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
                            <span>HAZMAT & CHEMICAL SDS SAFETY COMPASS</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                49 CFR / OSHA 1910.120
                            </span>
                        </h3>
                        <p className="text-xs text-slate-400">
                            Instant safety data sheets, containment perimeters & PPE requirements
                        </p>
                    </div>
                </div>

                {onClose && (
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white text-sm font-mono px-2.5 py-1 rounded-md hover:bg-slate-800"
                    >
                        ✕ Close
                    </button>
                )}
            </div>

            {/* Search input */}
            <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-900/50">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search chemical name, UN number, or trade name (e.g. ammonia, diesel, acid, chlorine)..."
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
            </div>

            {/* Main content: Master-Detail view */}
            <div className="grid grid-cols-1 md:grid-cols-3 flex-1 overflow-hidden">
                {/* List pane */}
                <div className="border-r border-slate-800 overflow-y-auto divide-y divide-slate-800/60 p-2">
                    {loading ? (
                        <div className="p-4 text-center text-xs text-slate-500">Loading SDS database...</div>
                    ) : filtered.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500">No matching substances found.</div>
                    ) : (
                        filtered.map((p) => {
                            const isSelected = selectedProtocol?.id === p.id;
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => setSelectedProtocol(p)}
                                    className={`w-full text-left p-3 rounded-lg transition-all mb-1 ${isSelected
                                        ? "bg-amber-500/10 border border-amber-500/30 text-white"
                                        : "hover:bg-slate-800/60 text-slate-300"
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-xs text-white">{p.chemical_name}</span>
                                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                                            {p.un_number}
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                                        {p.hazard_class}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-500">
                                        <span>Perimeter: {p.evacuation_radius_meters}m</span>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Detail pane */}
                <div className="md:col-span-2 p-5 overflow-y-auto bg-slate-950/40">
                    {selectedProtocol ? (
                        <div className="space-y-4">
                            {/* Headline */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-base font-bold text-white tracking-wide">
                                            {selectedProtocol.chemical_name}
                                        </h4>
                                        <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                            {selectedProtocol.un_number}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Classification: <span className="text-slate-200">{selectedProtocol.hazard_class}</span>
                                    </p>
                                </div>

                                <div className="text-right">
                                    <span className="text-[10px] font-mono text-slate-400 block uppercase">Evacuation Perimeter</span>
                                    <span className="text-lg font-black font-mono text-red-400">
                                        {selectedProtocol.evacuation_radius_meters} METERS
                                    </span>
                                </div>
                            </div>

                            {/* PPE Card */}
                            <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800">
                                <h5 className="text-xs font-bold font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-2">
                                    <span>🥽 MANDATORY PERSONAL PROTECTIVE EQUIPMENT (PPE)</span>
                                </h5>
                                <p className="text-xs text-slate-200 leading-relaxed font-mono bg-slate-950 p-2.5 rounded border border-slate-800/80">
                                    {selectedProtocol.ppe_required}
                                </p>
                            </div>

                            {/* Containment Procedure */}
                            <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800">
                                <h5 className="text-xs font-bold font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 mb-2">
                                    <span>🛡️ IMMEDIATE SPILL & CONTAINMENT ACTION</span>
                                </h5>
                                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-2.5 rounded border border-slate-800/80">
                                    {selectedProtocol.containment_procedure}
                                </p>
                            </div>

                            {/* First Aid */}
                            <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800">
                                <h5 className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-2">
                                    <span>🩹 FIRST AID & EXPOSURE PROTOCOL</span>
                                </h5>
                                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-2.5 rounded border border-slate-800/80">
                                    {selectedProtocol.first_aid_action}
                                </p>
                            </div>

                            {/* Common Synonyms */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-2 text-xs">
                                <span className="text-slate-500 font-mono text-[11px]">Synonyms / Spoken Triggers:</span>
                                {selectedProtocol.synonyms.map((s) => (
                                    <span
                                        key={s}
                                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700"
                                    >
                                        "{s}"
                                    </span>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-500 text-sm">
                            Select a substance on the left to view Safety Data Sheet guidance.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
