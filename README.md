# SiteSpeak 2.0 — Autonomous Industrial Safety Voice Agent & Digital Twin

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![AssemblyAI](https://img.shields.io/badge/Voice%20Agent%20API-Universal--3%20Pro-indigo.svg)](https://www.assemblyai.com/)
[![Node](https://img.shields.io/badge/Backend-Fastify%20%2B%20SQLite%20WAL-cyan.svg)](apps/server)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite%20%2B%20TS-blue.svg)](apps/client)

Built for the **AssemblyAI Voice Agent Hackathon** (lablab.ai × AssemblyAI, Sep 1–30, 2026).

A field worker taps one button and talks naturally (*"Chemical spill near Bay 3, strong ammonia smell, one person slipped"*). In sub-second latency, an AssemblyAI-powered voice agent:
1. Advises safety and evacuation protocols aloud.
2. Assesses **HAZMAT SDS data sheets** (UN numbers, mandatory PPE, evacuation perimeters).
3. Pinpoints emergency safety equipment (eyewash, spill kits, AEDs) on a **Live Digital Twin Map**.
4. Dispatches corrective follow-ups to emergency responders.
5. Generates certified **OSHA Form 301** reports with one click.
6. Triggers site-wide **Emergency Broadcast Sirens** for critical catastrophes.

---

## 🏗️ Architecture

```
[👷 Field Worker Audio (Mic)]
         │ (24 kHz PCM16 via WebSocket)
         ▼
[⚡ AssemblyAI Voice Agent API]
  ├── Universal-3 Pro STT
  ├── Real-Time VAD & Barge-In Turn-Taking
  └── Managed LLM with 10 Client-Side JSON Tools
         │
         │ tool.call / tool.result
         ▼
[💻 SiteSpeak 2.0 Client (React + Vite + Web Audio)]
  ├── Field Voice Console & Waveform Visualizer
  ├── 2D/3D Digital Twin Safety Schematic
  ├── Supervisor Operations Center & Tool Audit Stream
  ├── HAZMAT / SDS Safety Compass
  ├── Autonomous Simulation Studio (6 Field Scenarios)
  └── Web Audio Sound FX (Walkie-Talkie Chirp & Siren)
         │
         │ REST API (execute & persist)
         ▼
[🛡️ SiteSpeak Backend (Node.js + Fastify + SQLite WAL)]
  ├── Single-Use Token Minter (agents.assemblyai.com/v1/token)
  ├── 10 Tool Handlers & Audit Trail
  ├── OSHA Standard 1904 Form 301 Generator
  └── Emergency Broadcast Event Dispatcher
```

---

## 🛠️ 10 Real-Time JSON-Schema Tools (`packages/schemas/tools.json`)

| Tool Name | Parameters | Purpose | Spoken Feedback |
|---|---|---|---|
| `lookup_site` | `query` | Disambiguates spoken site/zone | Grounded location resolution |
| `create_incident_draft` | `site_id, zone, category, description` | Opens draft record in SQLite | Draft opened in seconds |
| `update_incident` | `incident_id, injuries_count, injuries_desc, severity, zone` | Patches facts as worker speaks | Updates severity & injuries |
| `assess_hazmat_protocol` | `chemical_or_material, estimated_volume` | SDS lookup, UN #, PPE & evacuation radius | Immediate voice guidance on PPE & safe perimeter |
| `find_emergency_equipment` | `equipment_type, near_zone` | Locates nearest spill kit, eyewash, AED, fire extinguisher | Exact support column & distance directions |
| `trigger_emergency_broadcast` | `site_id, zone, reason, evacuation_required` | Sounds facility alarm & evacuation countdown | Siren engaged & evacuation alert broadcast |
| `query_site_status` | `site_id, zone` | Bidirectional query of open hazards | Spoken site safety briefing |
| `add_followup` | `incident_id, action, assignee_role, due_in_hours` | Dispatches task (EMT, HAZMAT, Maintenance) | Role assigned and logged |
| `file_incident` | `incident_id` | Validates & marks official report | Spoken confirmation + incident ID |
| `cancel_incident` | `incident_id, reason` | Voids false alarms gracefully | Warm spoken confirmation |

---

## 🚀 Quickstart

### Prerequisites
- Node.js 20+
- AssemblyAI API Key

```bash
# 1. Setup server environment
cp apps/server/.env.example apps/server/.env
# Edit apps/server/.env and set:
# ASSEMBLYAI_API_KEY=your_key_here

# 2. Install dependencies & seed database
npm install
npm run seed --workspace apps/server

# 3. Start backend & frontend dev servers (two terminals or concurrent)
npm run dev --workspace apps/server   # Fastify backend on http://localhost:8787
npm run dev --workspace apps/client   # Vite frontend on http://localhost:5173
```

Open `http://localhost:5173` in your browser.

---

## 🎮 Five Specialized Views

1. **Field Console (`/` - Tab 1):** Large glove-friendly talk button, real-time waveform visualizer, partial transcript streaming, and live tool call feed.
2. **Digital Twin Schematic (Tab 2):** Interactive SVG facility map showing North Yard and Warehouse B, animated hazard rings, emergency equipment markers, and evacuation corridors.
3. **Supervisor Command (Tab 3):** Real-time incident list, KPI metrics, live follow-up completion checkboxes, millisecond latency tool audit trail, and certified **OSHA Form 301** export.
4. **HAZMAT / SDS Compass (Tab 4):** Live search for hazardous chemicals (Ammonia, Diesel, Sulfuric Acid, Chlorine, Hydraulic fluid) with UN hazard class, mandatory PPE checklists, and evacuation perimeters.
5. **Simulation Studio (Tab 5):** Zero-mic testing suite featuring 6 automated multi-turn industrial scenarios with real server tool execution and synthetic industrial machinery background noise simulator.

---

## 📋 API Endpoints

- `GET /healthz` — System health check
- `GET /api/agent-config` — System prompt, greeting, and 10 flat-schema tools
- `GET /api/token` — Mints single-use Voice Agent tokens
- `POST /api/tools/execute` — Executes client-side tools and audits to `tool_audit`
- `GET /api/incidents` & `GET /api/incidents/:id` — Incident queries
- `PATCH /api/incidents/:id` — Updates incident status or severity
- `PATCH /api/followups/:id/toggle` — Toggles follow-up action completion
- `GET /api/hazmat-protocols` — Safety data sheets (SDS) and PPE guidelines
- `GET /api/emergency-equipment` — Emergency safety equipment mapping
- `GET /api/emergency-broadcasts` & `POST /api/emergency-broadcasts/:id/clear` — Emergency alarms
- `GET /api/osha-301/:id` — Certified OSHA Standard 1904 Form 301 report data
- `GET /api/tool-audit` & `GET /api/stats` — Audit logging & analytics

---

## 📄 License

MIT License. Built for the AssemblyAI Voice Agent Hackathon on lablab.ai.