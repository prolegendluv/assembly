import { getDb, uid } from "./db.js";
import { seedDatabase } from "./seed.js";

export type ToolArgs = Record<string, any>;

export function ensureSitesAndSeedData() {
    const db = getDb();
    const siteCount = (db.prepare(`SELECT COUNT(*) as c FROM sites`).get() as any)?.c ?? 0;
    if (siteCount === 0) {
        seedDatabase();
    }
}

export function ensureSites() {
    ensureSitesAndSeedData();
}

function audit(session_id: string, tool: string, args: any, result: any, ms: number) {
    getDb().prepare(`INSERT INTO tool_audit (session_id, tool, args, result, ms) VALUES (?, ?, ?, ?, ?)`)
        .run(session_id, tool, JSON.stringify(args), JSON.stringify(result), ms);
}

function computeOshaStatus(category: string, severity: string, injuries_count: number) {
    const isReportable = injuries_count > 0 || ["fire", "structural", "fall"].includes(category) || ["high", "critical"].includes(severity);
    const code = isReportable ? "1904.7 - General Recording Criteria" : "";
    return { isReportable: isReportable ? 1 : 0, code };
}

export async function executeTool(session_id: string, name: string, args: ToolArgs): Promise<any> {
    const t0 = Date.now();
    ensureSitesAndSeedData();
    const db = getDb();
    let result: any;

    switch (name) {
        case "lookup_site": {
            const q = String(args.query ?? "").toLowerCase();
            const sites = db.prepare(`SELECT * FROM sites`).all() as any[];
            let hit: any = null;

            for (const s of sites) {
                const zones: string[] = typeof s.zones === "string" ? JSON.parse(s.zones || "[]") : (s.zones ?? []);
                const z = zones.find((item: string) => q.includes(item.toLowerCase()) || item.toLowerCase().includes(q));
                if (q.includes(s.site_id.replace("-", " ")) || q.includes(s.label.toLowerCase()) || z) {
                    hit = { site_id: s.site_id, label: s.label, zone: z ?? zones[0], zones };
                    break;
                }
            }

            if (!hit && sites.length > 0) {
                const defaultSite = sites[0];
                const defaultZones = typeof defaultSite.zones === "string" ? JSON.parse(defaultSite.zones || "[]") : defaultSite.zones;
                hit = { site_id: defaultSite.site_id, label: defaultSite.label, zone: defaultZones[0] ?? "bay 1", note: "defaulted, confirm with worker" };
            }

            result = hit ?? { site_id: "north-yard", label: "North Yard", zone: "bay 1", note: "defaulted, confirm with worker" };
            break;
        }

        case "create_incident_draft": {
            const id = uid("inc");
            const cat = String(args.category ?? "other");
            const osha = computeOshaStatus(cat, "medium", 0);
            db.prepare(`INSERT INTO incidents (id, site_id, zone, category, description, severity, status, osha_reportable, osha_code)
                VALUES (?, ?, ?, ?, ?, 'medium', 'draft', ?, ?)`)
                .run(id, String(args.site_id), String(args.zone), cat, String(args.description), osha.isReportable, osha.code);
            result = {
                incident_id: id,
                status: "draft",
                osha_flag: osha.isReportable === 1,
                notice: "Draft opened. Add injuries or severity updates if known."
            };
            break;
        }

        case "update_incident": {
            const row: any = db.prepare(`SELECT * FROM incidents WHERE id = ?`).get(String(args.incident_id));
            if (!row) { result = { error: "incident_not_found" }; break; }

            const currentInjuries = args.injuries_count !== undefined ? Number(args.injuries_count) : row.injuries_count;
            const currentCat = args.category !== undefined ? String(args.category) : row.category;
            const currentSev = args.severity !== undefined ? String(args.severity) : row.severity;
            const osha = computeOshaStatus(currentCat, currentSev, currentInjuries);

            const patch: string[] = [];
            const vals: any[] = [];
            for (const k of ["zone", "category", "injuries_desc", "severity"] as const) {
                if (args[k] !== undefined) { patch.push(`${k} = ?`); vals.push(String(args[k])); }
            }
            if (args.injuries_count !== undefined) { patch.push(`injuries_count = ?`); vals.push(Number(args.injuries_count)); }

            patch.push(`osha_reportable = ?`, `osha_code = ?`);
            vals.push(osha.isReportable, osha.code);

            vals.push(String(args.incident_id));
            db.prepare(`UPDATE incidents SET ${patch.join(", ")} WHERE id = ?`).run(...vals);

            result = {
                incident_id: String(args.incident_id),
                updated: patch.length,
                severity: currentSev,
                osha_reportable: osha.isReportable === 1,
            };
            break;
        }

        case "assess_hazmat_protocol": {
            const substance = String(args.chemical_or_material ?? "").toLowerCase();
            const protocols = db.prepare(`SELECT * FROM hazmat_protocols`).all() as any[];

            let matchedProtocol = protocols.find((h) => {
                const synonyms: string[] = typeof h.synonyms === "string" ? JSON.parse(h.synonyms || "[]") : (h.synonyms ?? []);
                return (
                    h.chemical_name.toLowerCase().includes(substance) ||
                    synonyms.some((s: string) => substance.includes(s.toLowerCase()) || s.toLowerCase().includes(substance))
                );
            });

            if (!matchedProtocol && protocols.length > 0) {
                matchedProtocol = protocols[0];
            }

            if (matchedProtocol) {
                result = {
                    matched_chemical: matchedProtocol.chemical_name,
                    un_number: matchedProtocol.un_number,
                    hazard_class: matchedProtocol.hazard_class,
                    mandatory_ppe: matchedProtocol.ppe_required,
                    evacuation_perimeter_meters: matchedProtocol.evacuation_radius_meters,
                    containment_action: matchedProtocol.containment_procedure,
                    first_aid_action: matchedProtocol.first_aid_action,
                    spoken_advice: `Safety protocol for ${matchedProtocol.chemical_name}: Evacuate ${matchedProtocol.evacuation_radius_meters} meters. Requires ${matchedProtocol.ppe_required}.`,
                };
            } else {
                result = { error: "protocol_not_found", message: "Consult on-site safety officer for unknown substance." };
            }
            break;
        }

        case "find_emergency_equipment": {
            const eqType = String(args.equipment_type ?? "").toLowerCase();
            const nearZone = String(args.near_zone ?? "").toLowerCase();

            let items: any[] = db.prepare(`SELECT * FROM emergency_equipment WHERE equipment_type LIKE ? OR equipment_type = ?`).all(`%${eqType}%`, eqType);
            if (items.length === 0) {
                items = db.prepare(`SELECT * FROM emergency_equipment`).all();
            }

            let target = items.find((i: any) => nearZone.includes(i.zone.toLowerCase()) || i.zone.toLowerCase().includes(nearZone));
            if (!target && items.length > 0) target = items[0];

            if (target) {
                result = {
                    found: true,
                    equipment_type: target.equipment_type,
                    zone: target.zone,
                    site_id: target.site_id,
                    location: target.location_detail,
                    status: target.status,
                    spoken_directions: `The nearest ${target.equipment_type.replace(/_/g, " ")} is at ${target.zone}, ${target.location_detail}.`,
                };
            } else {
                result = { found: false, message: "No equipment mapped in zone. Check main safety board." };
            }
            break;
        }

        case "trigger_emergency_broadcast": {
            const broadcastId = uid("alert");
            const siteId = String(args.site_id ?? "north-yard");
            const zone = args.zone ? String(args.zone) : "All Zones";
            const reason = String(args.reason ?? "Critical Life Safety Hazard");
            const evac = args.evacuation_required === true ? 1 : 1;

            db.prepare(`INSERT INTO emergency_broadcasts (id, site_id, zone, reason, evacuation_required, status)
                VALUES (?, ?, ?, ?, ?, 'active')`)
                .run(broadcastId, siteId, zone, reason, evac);

            result = {
                broadcast_id: broadcastId,
                site_id: siteId,
                zone,
                alarm_level: "CRITICAL_FACILITY_ALERT",
                evacuation_ordered: true,
                spoken_alert: `EMERGENCY BROADCAST ACTIVATED for ${siteId} ${zone}. Evacuation ordered: ${reason}.`,
            };
            break;
        }

        case "query_site_status": {
            const siteId = String(args.site_id ?? "north-yard");
            const activeBroadcast = db.prepare(`SELECT * FROM emergency_broadcasts WHERE site_id = ? AND status = 'active' LIMIT 1`).get(siteId) as any;
            const openIncidents = db.prepare(`SELECT COUNT(*) as count FROM incidents WHERE site_id = ? AND status != 'cancelled'`).get(siteId) as any;
            const criticalIncidents = db.prepare(`SELECT COUNT(*) as count FROM incidents WHERE site_id = ? AND severity = 'critical' AND status != 'cancelled'`).get(siteId) as any;

            result = {
                site_id: siteId,
                has_active_emergency: !!activeBroadcast,
                active_emergency_details: activeBroadcast ? activeBroadcast.reason : null,
                total_active_incidents: openIncidents?.count ?? 0,
                critical_count: criticalIncidents?.count ?? 0,
                spoken_summary: activeBroadcast
                    ? `Warning! Active emergency broadcast on ${siteId}: ${activeBroadcast.reason}. Evacuation in effect.`
                    : `${siteId} currently has ${openIncidents?.count ?? 0} incidents on record, with ${criticalIncidents?.count ?? 0} critical. Safety status normal.`,
            };
            break;
        }

        case "add_followup": {
            const id = uid("fol");
            db.prepare(`INSERT INTO followups (id, incident_id, action, assignee_role, due_in_hours) VALUES (?, ?, ?, ?, ?)`)
                .run(id, String(args.incident_id), String(args.action), String(args.assignee_role ?? "supervisor"), Number(args.due_in_hours ?? 4));
            result = {
                followup_id: id,
                assigned_to: String(args.assignee_role ?? "supervisor"),
                action: String(args.action),
            };
            break;
        }

        case "file_incident": {
            const row: any = db.prepare(`SELECT * FROM incidents WHERE id = ?`).get(String(args.incident_id));
            if (!row) { result = { error: "incident_not_found" }; break; }
            if (!row.zone || !row.category) { result = { error: "missing_fields", need: ["zone", "category"] }; break; }
            db.prepare(`UPDATE incidents SET status = 'filed', filed_at = datetime('now') WHERE id = ?`).run(String(args.incident_id));
            result = {
                incident_id: String(args.incident_id),
                status: "filed",
                osha_reportable: row.osha_reportable === 1,
                confirmation_code: `OSHA-${String(args.incident_id).slice(-6).toUpperCase()}`,
            };
            break;
        }

        case "cancel_incident": {
            db.prepare(`UPDATE incidents SET status = 'cancelled' WHERE id = ?`).run(String(args.incident_id));
            result = { incident_id: String(args.incident_id), status: "cancelled", notice: "Incident draft voided." };
            break;
        }

        default:
            result = { error: `unknown_tool:${name}` };
    }

    audit(session_id, name, args, result, Date.now() - t0);
    return result;
}