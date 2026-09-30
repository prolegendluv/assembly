import React, { useEffect, useState } from "react";
import { EmergencyBroadcast } from "../types";
import { ShieldAlertIcon, AlertTriangleIcon } from "./Icons";
import { playEmergencyAlarm, stopEmergencyAlarm, isEmergencyAlarmActive } from "../lib/soundEffects";

interface EmergencyBroadcastBannerProps {
    broadcast: EmergencyBroadcast | null;
    onClearBroadcast?: (id: string) => void;
}

export const EmergencyBroadcastBanner: React.FC<EmergencyBroadcastBannerProps> = ({
    broadcast,
    onClearBroadcast,
}) => {
    const [soundEnabled, setSoundEnabled] = useState(false);

    useEffect(() => {
        if (broadcast && broadcast.status === "active") {
            // If user previously engaged sound, play alarm
            if (soundEnabled) {
                playEmergencyAlarm();
            }
        } else {
            stopEmergencyAlarm();
        }
        return () => {
            stopEmergencyAlarm();
        };
    }, [broadcast, soundEnabled]);

    if (!broadcast || broadcast.status !== "active") return null;

    const toggleSound = () => {
        if (soundEnabled) {
            stopEmergencyAlarm();
            setSoundEnabled(false);
        } else {
            playEmergencyAlarm();
            setSoundEnabled(true);
        }
    };

    return (
        <div className="relative overflow-hidden bg-red-950 border-y-2 border-red-600 shadow-2xl text-white px-4 py-3 animate-pulse">
            {/* Background strobe pattern */}
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ef4444_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-red-600/30 text-red-400 border border-red-500 flex-shrink-0 animate-bounce">
                        <ShieldAlertIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="bg-red-600 text-white font-black text-xs px-2 py-0.5 rounded tracking-widest uppercase">
                                CRITICAL EMERGENCY BROADCAST
                            </span>
                            <span className="font-mono text-xs text-red-300">
                                {new Date(broadcast.triggered_at).toLocaleTimeString()}
                            </span>
                        </div>
                        <h2 className="text-base font-bold text-white tracking-wide mt-0.5">
                            {broadcast.reason}
                        </h2>
                        <p className="text-xs text-red-200">
                            Location: <span className="font-semibold text-white uppercase">{broadcast.site_id} &bull; {broadcast.zone}</span>
                            {broadcast.evacuation_required ? " — IMMEDIATE EVACUATION ORDERED TO PRIMARY MUSTER POINT" : ""}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleSound}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${soundEnabled
                            ? "bg-red-500 text-white shadow-lg shadow-red-500/50"
                            : "bg-red-900/80 text-red-200 hover:bg-red-800 border border-red-700"
                            }`}
                    >
                        {soundEnabled ? "🔊 Mute Siren" : "🔈 Sound Siren"}
                    </button>

                    {onClearBroadcast && (
                        <button
                            onClick={() => onClearBroadcast(broadcast.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-all"
                        >
                            Supervisor Dismiss
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
