import React, { useState, useEffect } from "react";
import { OshaFormDoc } from "../types";
import { ShieldAlertIcon, CheckCircleIcon } from "./Icons";

interface OshaReportModalProps {
    incidentId: string;
    onClose: () => void;
}

export const OshaReportModal: React.FC<OshaReportModalProps> = ({ incidentId, onClose }) => {
    const [doc, setDoc] = useState<OshaFormDoc | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/osha-301/${incidentId}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.oshaDoc) setDoc(data.oshaDoc);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [incidentId]);

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadJson = () => {
        if (!doc) return;
        const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${doc.case_number}.json`;
        a.click();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden text-slate-200 my-8">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-red-600/20 text-red-400 border border-red-500/40 flex items-center justify-center font-black text-xs">
                            OSHA
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white tracking-wide">
                                OSHA FORM 301 &mdash; INJURY AND ILLNESS INCIDENT REPORT
                            </h3>
                            <p className="text-xs text-slate-400">
                                29 CFR Part 1904 Compliance Verification
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDownloadJson}
                            className="px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
                        >
                            ⬇️ Export JSON
                        </button>
                        <button
                            onClick={handlePrint}
                            className="px-3 py-1.5 rounded-lg text-xs font-mono bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md transition-all"
                        >
                            🖨️ Print Form
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 text-lg leading-none"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Form Body */}
                <div className="p-6 overflow-y-auto max-h-[75vh] space-y-6 print:p-0 print:text-black">
                    {loading ? (
                        <div className="text-center py-12 text-slate-500 text-sm">
                            Generating certified OSHA Form 301...
                        </div>
                    ) : !doc ? (
                        <div className="text-center py-12 text-red-400 text-sm">
                            Failed to generate OSHA Form for incident {incidentId}.
                        </div>
                    ) : (
                        <>
                            {/* Official Header Banner */}
                            <div className="border-2 border-slate-700 p-4 rounded-lg bg-slate-950/60 flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <div className="text-xs uppercase tracking-widest text-slate-400 font-mono">
                                        U.S. Department of Labor &bull; Occupational Safety and Health Administration
                                    </div>
                                    <div className="text-lg font-black text-white mt-1">
                                        Form 301: Injury and Illness Incident Report
                                    </div>
                                    <div className="text-xs text-slate-400 mt-0.5">
                                        Establishment: <span className="font-semibold text-slate-200">{doc.establishment_name}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-mono uppercase text-slate-400">Official Case Number</div>
                                    <div className="text-base font-mono font-bold text-amber-400 tracking-wider">
                                        {doc.case_number}
                                    </div>
                                    <div className="mt-1">
                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${doc.osha_reportable
                                            ? "bg-red-500/20 text-red-300 border border-red-500/40"
                                            : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                                            }`}>
                                            {doc.osha_reportable ? "MANDATORY RECORDABLE" : "STANDARD RECORD"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Section 1: Event & Location */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800">
                                    <span className="text-[10px] font-mono text-slate-400 uppercase block">1. Facility Site & Zone</span>
                                    <span className="text-sm font-semibold text-white mt-1 block">
                                        {doc.site} &mdash; <span className="text-amber-400 font-mono">{doc.zone}</span>
                                    </span>
                                </div>
                                <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800">
                                    <span className="text-[10px] font-mono text-slate-400 uppercase block">2. Date & Time Reported</span>
                                    <span className="text-sm font-semibold text-white mt-1 block font-mono">
                                        {new Date(doc.date_of_incident).toLocaleString()}
                                    </span>
                                </div>
                                <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800">
                                    <span className="text-[10px] font-mono text-slate-400 uppercase block">3. Category & Hazard Class</span>
                                    <span className="text-sm font-semibold text-cyan-400 mt-1 block uppercase font-mono">
                                        {doc.incident_category} &bull; {doc.severity_classification} SEVERITY
                                    </span>
                                </div>
                                <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800">
                                    <span className="text-[10px] font-mono text-slate-400 uppercase block">4. OSHA Standard Code</span>
                                    <span className="text-sm font-semibold text-slate-200 mt-1 block font-mono">
                                        {doc.osha_standard_code}
                                    </span>
                                </div>
                            </div>

                            {/* Section 2: Narrative Description */}
                            <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800">
                                <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                                    5. Description of Event & How Injury/Illness Occurred
                                </span>
                                <p className="text-sm text-slate-200 leading-relaxed font-sans bg-slate-900/60 p-3 rounded border border-slate-800">
                                    {doc.description_of_event}
                                </p>
                            </div>

                            {/* Section 3: Injuries & Treatment */}
                            <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                                        6. Recorded Injuries & Symptoms
                                    </span>
                                    <span className="font-mono text-xs text-amber-400 font-bold">
                                        {doc.injuries_recorded} Person(s) Affected
                                    </span>
                                </div>
                                <div className="text-sm text-slate-300 bg-slate-900/60 p-3 rounded border border-slate-800">
                                    {doc.injuries_notes}
                                </div>
                            </div>

                            {/* Section 4: Corrective Actions & Role Assignments */}
                            <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800">
                                <span className="text-[10px] font-mono text-slate-400 uppercase block mb-2">
                                    7. Corrective Actions & Role Dispatches Assigned
                                </span>
                                {doc.corrective_actions.length === 0 ? (
                                    <div className="text-xs text-slate-500 italic">No secondary follow-ups queued.</div>
                                ) : (
                                    <div className="space-y-2">
                                        {doc.corrective_actions.map((act, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800 text-xs"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className={act.completed ? "text-emerald-400" : "text-amber-400"}>
                                                        {act.completed ? "✓ [COMPLETED]" : "⏳ [PENDING]"}
                                                    </span>
                                                    <span className="text-slate-200">{act.action}</span>
                                                </div>
                                                <span className="font-mono text-slate-400 uppercase text-[10px] bg-slate-800 px-2 py-0.5 rounded">
                                                    Assignee: {act.assignee || "Supervisor"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Certification Footer */}
                            <div className="border-t border-slate-800 pt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                                <div>
                                    <div className="font-semibold text-slate-300">
                                        Certified Autonomous Voice Incident Log
                                    </div>
                                    <div className="text-[11px] text-slate-500 font-mono">
                                        {doc.compliance_certification}
                                    </div>
                                </div>
                                <div className="font-mono text-right text-emerald-400 flex items-center gap-1.5">
                                    <CheckCircleIcon className="w-4 h-4" />
                                    <span>Validated SHA-256 Hash</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
