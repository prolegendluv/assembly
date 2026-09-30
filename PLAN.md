# SiteSpeak — Hands-Free Field Safety & Incident Reporting Voice Agent
### AssemblyAI Voice Agent Hackathon (lablab.ai × AssemblyAI) — Detailed Build Plan

**Dates:** Sep 1–30, 2026 (we start Sep 15 — ~15 days left)
**Format:** Online, registration open whole window. Submission deadline is the same for everyone: Sep 30.
**Prize:** $10,000 total — 5 winners × ($1,000 cash + $1,000 AAI credits)
**Channel:** Browser voice only (no phone/Twilio — per decision)
**Stack:** TypeScript + React (client) + Node.js (server)
**Voice path:** AssemblyAI **Voice Agent API** (end-to-end: Universal-3 Pro STT + LLM routing + voice output + VAD/turn-taking + JSON-Schema tool calling)
**Fallback path:** Realtime STT (WebSocket) + own LLM via LLM Gateway + own TTS — only if Voice Agent API access/credits block us.

> **API key:** do NOT commit the key. Put it in `server/.env` as `ASSEMBLYAI_API_KEY=...` (gitignored). Rotate the key after the hackathon since it was shared in chat.

---

## 1. Project Summary

**SiteSpeak** is a voice-native safety companion for construction / warehouse / factory field workers whose hands are busy and screens are impractical.

A worker taps one button, talks naturally ("There's a chemical spill near bay 3, one person slipped, no ambulance needed yet"), and the agent:

1. Transcribes in real time with sub-second latency,
2. Asks targeted clarifying questions (where exactly? anyone injured? severity? photo needed?),
3. Fills a **structured incident report via JSON-Schema tool calls** while talking,
4. Files the report to SQLite, assigns severity + required follow-ups,
5. Shows everything live on a supervisor dashboard (transcript + tool-call feed + filed report + stats).

### Why this wins

| Judging criterion | How SiteSpeak scores |
|---|---|
| **Application of Technology** | Full Voice Agent API: streaming STT, VAD/turn-taking, LLM routing, **5–6 JSON-Schema tools** actually executed mid-conversation, not a mic-wrapped chatbot. |
| **Business Value** | Safety incidents cost $170B+/yr (US). Paper/radio reporting is slow, incomplete, under-reported. Quantify: "report filed in 90 seconds hands-free vs 20-min paperwork; structured data from day one." |
| **Originality** | Voice is *essential*, not a gimmick — hands are gloved/dirty/busy. Text chatbot cannot compete on a scaffold. |
| **Presentation** | Live-audio demo + visible tool-call event feed + before/after (chaotic speech → clean structured report). Highly demoable in a 2–3 min video. |

### Alternatives considered (rejected)

- **A. FrontDesk AI (clinic receptionist):** strong business value, but "AI receptionist" is the most crowded hackathon archetype. Lower originality.
- **B. DriveThru Voice (order taker):** fun/viral demo, weaker enterprise-seriousness for judges, menu-knowledge edge cases eat time.
- **D. TalentCalls (recruiter screener):** good fit for AssemblyAI customers (Ashby) but outbound-calling story is harder without telephony (and we ruled out phone).

---

## 2. Architecture

```
┌─────────────┐   mic PCM16 / WebSocket   ┌──────────────────┐   Voice Agent API   ┌──────────────┐
│  Browser     │ ───────────────────────▶ │  Node server      │ ──────────────────▶ │ AssemblyAI   │
│  (React)     │ ◀─────────────────────── │  (Fastify + ws)   │ ◀────────────────── │  Voice Agent │
│  mic capture │   mixed audio down        │  session + tools  │   transcripts,     │  API         │
│  + dashboard │   + transcript + events   │  + SQLite         │   audio, toolcalls │              │
└─────────────┘                           └──────────────────┘                     └──────────────┘
                                                     │ tool execution
                                                     ▼
                                              ┌──────────────┐
                                              │ SQLite (WAL) │
                                              │ incidents,   │
                                              │ followups,   │
                                              │ audit log    │
                                              └──────────────┘
```

### 2.1 Repos / monorepo layout

```
sitespeak/
├── PLAN.md                    # this file
├── README.md                  # hackathon-ready readme (badges, demo gif, quickstart)
├── LICENSE                    # MIT (required: submissions must be MIT-compliant)
├── .gitignore                 # .env, node_modules, *.db, dist
├── package.json               # npm workspaces: apps/*, packages/*
├── apps/
│   ├── client/                # React + Vite + TypeScript
│   │   ├── src/
│   │   │   ├── components/    # TalkButton, TranscriptPane, ToolCallFeed, ReportCard, Dashboard
│   │   │   ├── hooks/         # useMicStream, useAgentSession
│   │   │   ├── pages/         # FieldView (worker), SupervisorView (dashboard)
│   │   │   └── lib/audio.ts   # AudioWorklet resample to 16kHz PCM16, VAD meter
│   │   └── vite.config.ts
│   └── server/                # Node + Fastify + TypeScript
│       ├── src/
│       │   ├── index.ts       # boot, env check, routes
│       │   ├── agent.ts       # AssemblyAI session create/config, event loop
│       │   ├── tools.ts       # tool implementations (see §3)
│       │   ├── prompts.ts     # system prompt + few-shot examples
│       │   ├── db.ts          # better-sqlite3 init + migrations
│       │   ├── seed.ts        # demo sites, hazards, workers
│       │   └── routes/        # /api/session, /api/incidents, /api/stats, /healthz
│       └── .env.example       # ASSEMBLYAI_API_KEY=, PORT=, CLIENT_ORIGIN=
├── packages/
│   └── schemas/               # shared JSON Schemas + TS types (tool I/O, report model)
│       ├── tools.json         # canonical tool definitions sent to Voice Agent API
│       └── types.ts
├── db/
│   └── schema.sql             # incidents, followups, tool_audit
└── docs/
    ├── architecture.png       # diagram for slides/video
    ├── demo-script.md         # word-for-word 150-sec demo narration
    └── submission.md          # title, short/long description, tags (copy-paste to lablab)
```

### 2.2 Audio flow (browser-only)

1. Worker clicks **Hold to talk** → `getUserMedia` → `AudioWorklet` downsamples to 16 kHz mono PCM16 → chunks sent over app WebSocket to `server`.
2. Server forwards raw audio to AssemblyAI Voice Agent session (single connection per brief — "single connection, AssemblyAI handling the core voice interaction stack").
3. AssemblyAI returns: partial/final transcripts, agent audio, turn-taking/VAD events, `tool_call` invocations with JSON args.
4. Server executes tools against SQLite, returns `tool_result`; AssemblyAI speaks the result naturally; server relays agent audio chunks back to browser for playback + appends transcript/tool events to UI.
5. Barge-in: if worker interrupts, server forwards interruption per API semantics and cancels pending TTS playback client-side.

### 2.3 Key technical choices

- **No phone/Twilio.** Browser mic only. Removes telephony risk, keeps 15-day scope safe.
- **Server-mediated audio** (browser ↔ server ↔ AssemblyAI) rather than browser→AssemblyAI direct: keeps API key secret, lets us log/audit tool calls, and gives judges a visible event feed.
- **SQLite via better-sqlite3 (WAL mode):** zero-ops, file-backed, deployable anywhere; migratable to Postgres later. Perfect for hackathon + offline story ("works in a site trailer with spotty internet" — queue + sync is a stretch goal).
- **npm workspaces, no Turborepo** — minimize tooling overhead for a 2-week build.

---

## 3. Voice Agent Design (the core of the score)

### 3.1 System prompt (draft — `apps/server/src/prompts.ts`)

> You are SiteSpeak, a calm, concise construction-site safety assistant. The worker is hands-busy and may be stressed. Speak in short sentences. Your job: (1) capture WHAT happened, WHERE (site/zone), WHEN, WHO is affected, and severity; (2) ask at most ONE clarifying question at a time, highest-information first (injuries > location precision > containment); (3) call tools to create/update the incident as facts arrive — never wait for a "complete" story; (4) confirm the filed report back in ≤2 sentences and state the top follow-up. If anyone is seriously hurt or there is fire/structural collapse/gas, escalate immediately (severity=critical, followup=call-emergency) and say so plainly. Never invent site names, badge IDs, or injury details — ask or mark unknown.

Few-shots: spill-no-injury → medium; fall-from-ladder-with-injury → high + first-aid followup; worker says "never mind / false alarm" → cancel draft.

### 3.2 Tool schemas (JSON-Schema — the hero feature)

All defined in `packages/schemas/tools.json`, implemented in `apps/server/src/tools.ts`, every invocation written to `tool_audit` and rendered live in the UI feed.

| # | Tool | Args (schema) | Does | Demo moment |
|---|---|---|---|---|
| 1 | `create_incident_draft` | `{ site_id, zone, category: [spill, fall, equipment, electrical, fire, structural, near_miss, other], description }` | Opens draft, returns `incident_id` | "Draft #12 opened" pops on screen mid-sentence |
| 2 | `update_incident` | `{ incident_id, zone?, category?, injuries?: {count, description}, severity?: [low, medium, high, critical] }` | Patches draft as facts arrive | Severity chip flips live |
| 3 | `add_followup` | `{ incident_id, action, assignee_role?, due_in_hours? }` | Queues corrective action | Follow-up checklist grows |
| 4 | `lookup_site` | `{ query }` | Resolves "bay 3" → canonical zone/site | Shows grounding, not hallucination |
| 5 | `file_incident` | `{ incident_id }` | Validates required fields, marks `filed`, timestamps | Big "FILED ✓" + spoken confirmation |
| 6 | `cancel_incident` | `{ incident_id, reason }` | Voids false alarms | Handles the "never mind" edge case |

Validation rules: `file_incident` refuses if `zone` or `category` missing → agent asks for exactly what's missing (great for showing structured-extraction live).

### 3.3 Conversation states

`idle → listening → reasoning(tool_call?) → speaking → (barge-in?) → filed/cancelled`. Persist per-session: `session_id → incident_id` so a dropped mic doesn't lose the draft (reconnect resumes).

### 3.4 Edge cases to handle explicitly (judges probe these)

- Silence 6s → gentle re-prompt ("Are you still there? Where did this happen?").
- Barge-in mid-question → stop TTS, listen, merge new facts via `update_incident`.
- Contradiction ("no one hurt" → "actually his ankle") → update + confirm change aloud.
- Background noise / multi-speaker → keep last-confirmed facts, ask single disambiguating question.
- False alarm → `cancel_incident`, friendly close.
- Accent/multilingual: lean on Universal-3 Pro multilingual STT; seed demo with at least one non-native-English test run.

---

## 4. UI Design (what judges see)

Two views, one app:

**FieldView (`/` — worker, mobile-first):**
- Giant talk button with live VAD ring + connection status dot.
- Live transcript (worker vs agent bubbles, partials in lighter text).
- "Report building…" card: category/zone/severity slots fill in as tools fire.
- Filed confirmation screen with incident ID + follow-ups.

**SupervisorView (`/dashboard` — desktop):**
- Left: live session transcript + tool-call event feed (tool name, args JSON, result, latency ms).
- Center: filed report card (structured, printable).
- Right: stats (incidents today by severity/category, avg time-to-file) + incident table (filter by severity/status).

Design: dark industrial theme, high contrast, huge touch targets, works with gloves (keyboard optional). No UI framework beyond Tailwind; shadcn-style minimal components hand-rolled to avoid dep bloat.

---

## 5. Data Model (`db/schema.sql`)

```sql
incidents(id TEXT PK, site_id TEXT, zone TEXT, category TEXT,
  description TEXT, injuries_count INT DEFAULT 0, injuries_desc TEXT,
  severity TEXT DEFAULT 'medium', status TEXT DEFAULT 'draft', -- draft|filed|cancelled
  created_at DATETIME, filed_at DATETIME NULL);
followups(id TEXT PK, incident_id FK, action TEXT, assignee_role TEXT, due_in_hours INT, done INT DEFAULT 0);
tool_audit(id INTEGER PK, session_id TEXT, tool TEXT, args JSON, result JSON, ms INT, at DATETIME);
```

Seed: 2 sites ("North Yard", "Warehouse B"), 8 zones ("bay 3", "dock 1"…), 6 sample filed incidents for dashboard depth on first load.

---

## 6. 15-Day Execution Plan (Sep 15 → Sep 30)

| Days | Milestone | Exit criteria |
|---|---|---|
| **D1–2 (Sep 15–16) — Access & spike** | Signup/credits check; run official Voice Agent API quickstart verbatim; prove mic→transcript→audio loop in a scratch script | Scratch `spike.js` produces one full voice turn; exact API event names + tool_call payload shape documented in `docs/api-notes.md` |
| **D3–5 (Sep 17–19) — Core loop** | Scaffold monorepo (workspaces, MIT, .gitignore, .env.example); server session endpoint + WS relay; client mic capture + playback + transcript pane | Talk button → live conversation with acceptable turn-taking; no tools yet |
| **D6–9 (Sep 20–23) — Domain depth** | Implement 6 tools + SQLite + prompts; seed data; FieldView report-building card; handle §3.4 edge cases | Full scenario passes hands-free: spill report filed with 2 follow-ups; false-alarm cancel works |
| **D10–11 (Sep 24–25) — Polish & deploy** | SupervisorView dashboard + tool-call feed + stats; error/empty states; deploy client (Vercel) + server (Railway/Render/Fly); public GitHub + README | Public URL works from a fresh laptop + phone browser; README has 1-min quickstart |
| **D12–14 (Sep 26–28) — Submission assets** | Record 2–3 min video (live audio, no fakes), 8–10 slide deck, cover image, short/long descriptions, tags | All lablab submission fields filled; video uploaded |
| **D15 (Sep 29–30) — Buffer** | Bug bash, latency pass, backup demo recording, submit early | Submitted ≥12h before deadline; repo tagged `v1.0-hackathon` |

**Daily cadence:** ship one vertical slice per day; keep `main` deployable; 10-min E2E voice test every evening (mic on, real speech).

---

## 7. Submission Checklist (lablab.ai requirements)

- [ ] Project title (e.g., "SiteSpeak — Hands-Free Voice Safety Reporting")
- [ ] Short description (≤280 chars) + long description (problem, how it works, tech, business value)
- [ ] Technology & category tags (`assemblyai`, `voice-agent-api`, `universal-3`, `typescript`, `react`, `nodejs`, `websocket`, `sqlite`, `safety`, `construction`)
- [ ] Cover image (1200×630)
- [ ] Video presentation (2–3 min, live demo + architecture + tool-call close-up)
- [ ] Slide presentation (PDF: problem → demo → architecture → tools → business value → roadmap)
- [ ] Public GitHub repo, **MIT LICENSE**, no secrets committed
- [ ] Demo platform + Application URL (deployed + healthy `/healthz`)

---

## 8. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Voice Agent API event shape differs from docs / SDK drift | Medium | D1–2 spike discovers truth; isolate AssemblyAI I/O in `agent.ts` adapter so swaps are one-file changes |
| Turn-taking latency feels laggy on stage Wi-Fi | Medium | Server-mediated buffering + partial-transcript UI so *something* always moves; record backup demo video early |
| Credits burn during testing | Low–Med | Short sessions, mute loopback tests, reuse seed data; monitor usage dashboard daily |
| Mic permissions on deployed HTTPS | Low | Deploy client on HTTPS from day one (Vercel default); `http://localhost` only for dev |
| Scope creep (offline sync, auth, multi-site RBAC) | High | Explicitly out of scope for v1 — listed as "Roadmap" slide only |

**Out of scope for hackathon:** user auth, multi-tenant RBAC, Postgres migration, offline queue/sync, photo upload, SMS/email notifications, analytics beyond dashboard stats.

---

## 9. Demo Script (150 seconds — record D12)

1. (0:00–0:20) Hook: "Paperwork takes 20 minutes. Spills don't wait." Show blank dashboard.
2. (0:20–1:40) LIVE voice: worker describes spill → agent asks 2 questions → tool feed fires (`create_incident_draft` → `update_incident` → `add_followup` ×2 → `file_incident`) → spoken confirmation. Camera on both speaker and screen; no cuts during audio.
3. (1:40–2:10) Reveal: filed structured report + severity chip + follow-ups + stats tick up.
4. (2:10–2:30) Architecture (one diagram): "One AssemblyAI connection handles STT, turn-taking, LLM routing, and tool calling — we just execute tools and persist."

---

## 10. First Commands (when build starts)

```bash
# 1. verify key + quota (never commit the key)
curl -s -H "Authorization: $ASSEMBLYAI_API_KEY" https://api.assemblyai.com/v2/account

# 2. scaffold
npm init -y && npm pkg set name=sitespeak workspaces[]="apps/*" workspaces[]="packages/*"
mkdir -p apps/client apps/server packages/schemas db docs
# 3. server deps: fastify ws better-sqlite3 dotenv | client: vite react
# 4. run official Voice Agent quickstart verbatim in /tmp/spike before writing app code
```

**Definition of done:** public URL + public MIT repo + video + slides + lablab submission, all live by Sep 29 EOD, with at least one unedited live-audio demo take proving the full tool-calling loop.