import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { getDb } from "./db.js";
import { executeTool, ensureSitesAndSeedData } from "./tools.js";
import { SYSTEM_PROMPT, GREETING } from "./prompts.js";

const PORT = Number(process.env.PORT ?? 8787);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
const API_KEY = process.env.ASSEMBLYAI_API_KEY ?? "";

const app = Fastify({ logger: true });

// Flexible CORS to allow localhost, deployed origins, and mobile/curl testing
await app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
});

// Serve frontend build if present (for 1-click single container / host deployment)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = path.resolve(__dirname, "../../client/dist");
if (existsSync(clientDistPath)) {
    await app.register(fastifyStatic, {
        root: clientDistPath,
        prefix: "/",
    });
    app.setNotFoundHandler((req, reply) => {
        if (req.raw.url && req.raw.url.startsWith("/api")) {
            return reply.code(404).send({ error: "not_found" });
        }
        return reply.sendFile("index.html");
    });
}

getDb();
ensureSitesAndSeedData();

const TOOLS = JSON.parse(readFileSync(new URL("../../../packages/schemas/tools.json", import.meta.url), "utf-8"));

app.get("/healthz", async () => ({ ok: true, version: "2.0.0", time: new Date().toISOString() }));

// Agent config for browser: prompt + greeting + voice + tools
app.get("/api/agent-config", async () => ({
    system_prompt: SYSTEM_PROMPT,
    greeting: GREETING,
    voice: "anna",
    tools: TOOLS,
}));

// Mint a single-use Voice Agent token (server holds real API key).
app.get("/api/token", async (req, reply) => {
    if (!API_KEY) return reply.code(500).send({ error: "missing ASSEMBLYAI_API_KEY" });
    const r = await fetch(
        "https://agents.assemblyai.com/v1/token?expires_in_seconds=300&max_session_duration_seconds=1800",
        { headers: { Authorization: `Bearer ${API_KEY}` } }
    );
    const data = await r.json();
    if (!r.ok) return reply.code(502).send({ error: "token_mint_failed", detail: data });
    return data; // { token }
});

// Tool execution endpoint: browser client-side tools POST here, we persist + audit.
app.post("/api/tools/execute", async (req: any) => {
    const { session_id = "", name = "", args = {} } = (req.body ?? {}) as any;
    const result = await executeTool(String(session_id), String(name), args ?? {});
    return { result };
});

app.get("/api/incidents", async () => {
    const rows = getDb().prepare(`SELECT * FROM incidents ORDER BY created_at DESC LIMIT 100`).all();
    return { incidents: rows };
});

app.get("/api/incidents/:id", async (req: any, reply: any) => {
    const row = getDb().prepare(`SELECT * FROM incidents WHERE id = ?`).get(req.params.id);
    if (!row) return reply.code(404).send({ error: "not_found" });
    const followups = getDb().prepare(`SELECT * FROM followups WHERE incident_id = ?`).all(req.params.id);
    return { incident: row, followups };
});

app.patch("/api/incidents/:id", async (req: any, reply: any) => {
    const { status, severity, zone } = (req.body ?? {}) as any;
    const patch: string[] = [];
    const vals: any[] = [];
    if (status) { patch.push("status = ?"); vals.push(status); }
    if (severity) { patch.push("severity = ?"); vals.push(severity); }
    if (zone) { patch.push("zone = ?"); vals.push(zone); }
    if (patch.length === 0) return reply.code(400).send({ error: "no_fields_to_update" });
    vals.push(req.params.id);
    getDb().prepare(`UPDATE incidents SET ${patch.join(", ")} WHERE id = ?`).run(...vals);
    const updated = getDb().prepare(`SELECT * FROM incidents WHERE id = ?`).get(req.params.id);
    return { incident: updated };
});

app.patch("/api/followups/:id/toggle", async (req: any) => {
    const row: any = getDb().prepare(`SELECT * FROM followups WHERE id = ?`).get(req.params.id);
    if (!row) return { error: "not_found" };
    const nextDone = row.done === 1 ? 0 : 1;
    getDb().prepare(`UPDATE followups SET done = ? WHERE id = ?`).run(nextDone, req.params.id);
    return { id: req.params.id, done: nextDone };
});

app.get("/api/tool-audit", async (req: any) => {
    const limit = Math.min(Number((req.query as any)?.limit ?? 50), 200);
    const rows = getDb().prepare(`SELECT * FROM tool_audit ORDER BY id DESC LIMIT ?`).all(limit);
    return { events: rows };
});

app.get("/api/stats", async () => {
    const db = getDb();
    const total = (db.prepare(`SELECT COUNT(*) AS c FROM incidents`).get() as any).c;
    const filed = (db.prepare(`SELECT COUNT(*) AS c FROM incidents WHERE status='filed'`).get() as any).c;
    const oshaCount = (db.prepare(`SELECT COUNT(*) AS c FROM incidents WHERE osha_reportable=1`).get() as any).c;
    const bySeverity = db.prepare(`SELECT severity, COUNT(*) AS c FROM incidents GROUP BY severity`).all();
    const byCategory = db.prepare(`SELECT category, COUNT(*) AS c FROM incidents GROUP BY category`).all();
    const activeAlerts = (db.prepare(`SELECT COUNT(*) AS c FROM emergency_broadcasts WHERE status='active'`).get() as any).c;
    return { total, filed, oshaCount, activeAlerts, bySeverity, byCategory };
});

// HAZMAT & Safety Protocols
app.get("/api/hazmat-protocols", async () => {
    const rows = getDb().prepare(`SELECT * FROM hazmat_protocols`).all();
    return {
        protocols: rows.map((r: any) => ({
            ...r,
            synonyms: JSON.parse(r.synonyms || "[]"),
        })),
    };
});

// Emergency Safety Equipment
app.get("/api/emergency-equipment", async (req: any) => {
    const siteId = (req.query as any)?.site_id;
    const query = siteId
        ? getDb().prepare(`SELECT * FROM emergency_equipment WHERE site_id = ?`).all(siteId)
        : getDb().prepare(`SELECT * FROM emergency_equipment`).all();
    return { equipment: query };
});

// Emergency Broadcasts
app.get("/api/emergency-broadcasts", async () => {
    const rows = getDb().prepare(`SELECT * FROM emergency_broadcasts ORDER BY triggered_at DESC LIMIT 10`).all();
    return { broadcasts: rows };
});

app.post("/api/emergency-broadcasts/:id/clear", async (req: any) => {
    getDb().prepare(`UPDATE emergency_broadcasts SET status = 'cleared', cleared_at = datetime('now') WHERE id = ?`).run(req.params.id);
    return { ok: true, cleared_id: req.params.id };
});

// OSHA Form 301 Data Export
app.get("/api/osha-301/:id", async (req: any, reply: any) => {
    const incident: any = getDb().prepare(`SELECT * FROM incidents WHERE id = ?`).get(req.params.id);
    if (!incident) return reply.code(404).send({ error: "incident_not_found" });
    const followups = getDb().prepare(`SELECT * FROM followups WHERE incident_id = ?`).all(req.params.id);

    const oshaDoc = {
        form_title: "OSHA Form 301 - Injury and Illness Incident Report",
        establishment_name: "Apex Heavy Construction & Logistics - Site Operations",
        case_number: `OSHA-${incident.id.toUpperCase()}`,
        site: incident.site_id === "north-yard" ? "North Yard Yard 4B" : "Warehouse B Hub",
        zone: incident.zone,
        date_of_incident: incident.created_at,
        time_of_report: incident.filed_at || incident.created_at,
        severity_classification: incident.severity.toUpperCase(),
        incident_category: incident.category.toUpperCase(),
        description_of_event: incident.description,
        injuries_recorded: incident.injuries_count,
        injuries_notes: incident.injuries_desc || "None documented at initial filing",
        osha_standard_code: incident.osha_code || "1904.7 Recording Criteria",
        osha_reportable: incident.osha_reportable === 1,
        corrective_actions: followups.map((f: any) => ({
            action: f.action,
            assignee: f.assignee_role,
            completed: f.done === 1,
        })),
        compliance_certification: "Filed via SiteSpeak 2.0 Real-Time Voice Safety Protocol (Universal-3 Pro STT)",
    };

    return { oshaDoc };
});

// Dynamic Sites & Schematics from SQLite
app.get("/api/sites", async () => {
    const rows = getDb().prepare(`SELECT * FROM sites`).all() as any[];
    return {
        sites: rows.map((r) => ({
            site_id: r.site_id,
            label: r.label,
            zones: typeof r.zones === "string" ? JSON.parse(r.zones || "[]") : r.zones,
            schematic: typeof r.schematic === "string" ? JSON.parse(r.schematic || "[]") : (r.schematic ?? []),
        })),
    };
});

// Dynamic Suggested Voice Prompts from SQLite
app.get("/api/suggested-prompts", async () => {
    const rows = getDb().prepare(`SELECT * FROM prompt_suggestions`).all();
    return { prompts: rows };
});

// Dynamic Simulation Scenarios from SQLite
app.get("/api/simulation-scenarios", async () => {
    const rows = getDb().prepare(`SELECT * FROM simulation_scenarios`).all() as any[];
    return {
        scenarios: rows.map((r) => ({
            id: r.id,
            title: r.title,
            category: r.category,
            severityBadge: r.severity_badge,
            description: r.description,
            steps: typeof r.steps === "string" ? JSON.parse(r.steps || "[]") : r.steps,
        })),
    };
});

app.listen({ port: PORT, host: "0.0.0.0" });