
# SiteSpeak 2.0 — Presentation Deck Notes
**AssemblyAI Voice Agent Hackathon (lablab.ai × AssemblyAI)**

---

## Slide 1: Title & Hero
- **Project Title:** SiteSpeak 2.0 — Autonomous Industrial Safety Voice Agent & Digital Twin
- **Tagline:** Hands-free voice safety companion for high-risk industrial facilities. Speak naturally; the agent coordinates HAZMAT protocols, plots hazards on a Digital Twin, and files certified OSHA-301 reports.
- **Tech Stack:** AssemblyAI Voice Agent API (Universal-3 Pro STT, VAD turn-taking, managed LLM, 10 JSON tools), React 18, Vite, Fastify, SQLite WAL.
- **License:** MIT Licensed, 100% open source.

---

## Slide 2: The Problem
- **Headline:** Paperwork Takes 20 Minutes. Toxic Spills Don't Wait.
- **Key Statistics:**
  - Over $170 Billion in annual workplace injury costs in the US alone (OSHA / National Safety Council).
  - 20+ minute reporting lag between an incident and plant safety notification.
- **The "Dirty Gloves" Paradox:**
  - Construction workers, chemical handlers, and equipment operators wear heavy PPE gloves.
  - Touchscreens fail in grease, rain, or dust. Keyboards and forms are impossible on a scaffold.
- **Legacy Failures:**
  - Safety Data Sheets (SDS) are locked in physical binders hundreds of yards away.
  - Radio calls are noisy and uncoordinated.

---

## Slide 3: The Solution
- **Headline:** Speak Naturally. The Agent Takes Command.
- **How it works:**
  1. **Field Worker Speaks:** Worker taps one button and describes the incident in plain language.
  2. **10 Real-Time JSON Tools:** Sub-second tool calls fire during the speech stream (`lookup_site`, `assess_hazmat_protocol`, `find_emergency_equipment`).
  3. **Instant Voice Guidance:** Agent advises mandatory PPE (Level A/B/C), safe evacuation perimeters, and exact equipment locations aloud.

---

## Slide 4: AssemblyAI Voice Agent API Architecture
- **Single WebSocket Connection:** Streams 24 kHz PCM16 audio directly to AssemblyAI.
- **Universal-3 Pro STT:** Handles heavy accents and high-noise speech recognition.
- **Ultra-Fast VAD & Barge-In:** Enables natural interruptions when new critical facts emerge.
- **Enterprise Security:** Backend mints single-use, 300-second session tokens; real API keys never leave the server.
- **Bidirectional Tool Loop:** Agent triggers client tools, executing against SQLite with millisecond audit logging.

---

## Slide 5: The 10 Real-Time JSON-Schema Tools
- **Life-Safety & Emergency Tools:**
  - `assess_hazmat_protocol`: SDS lookup, UN hazard class, mandatory PPE, evacuation radius.
  - `find_emergency_equipment`: Locates eyewashes, spill kits, AEDs with support column coordinates.
  - `trigger_emergency_broadcast`: Sounds facility siren and site-wide evacuation banners.
  - `query_site_status`: Provides spoken briefings of active hazards.
- **Compliance & Incident Management Tools:**
  - `lookup_site`: Disambiguates location to canonical sites and zones.
  - `create_incident_draft`: Opens SQLite incident draft.
  - `update_incident`: Dynamically patches injury details, severity, and category.
  - `add_followup`: Assigns EMT, HAZMAT, or Maintenance teams with deadlines.
  - `file_incident` & `cancel_incident`: Validates completeness and files official report.

---

## Slide 6: Interactive Digital Twin & OSHA-301 Engine
- **Interactive SVG Digital Twin:**
  - Real-time schematic of North Yard and Warehouse B.
  - Glowing, pulsing hazard markers dynamically placed at reported coordinates.
  - Live equipment distance overlays and evacuation perimeter rings.
- **Certified OSHA Form 301 Generator:**
  - Maps voice conversation directly into official OSHA Standard 1904 Form 301 fields.
  - 1-click printable view and JSON export ready for federal safety compliance audits.

---

## Slide 7: Business Value & Industry Impact
- **92% Reduction in Reporting Latency:** From 20 minutes down to 90 seconds.
- **Sub-Second HAZMAT Guidance:** Eliminates delay in identifying hazardous chemicals and PPE levels.
- **100% Audit Readiness:** Zero forgotten fields, verifiable millisecond audit logs.
- **Direct ROI:** Cuts regulatory fines and minimizes downtime during chemical spills.

---

## Slide 8: Summary & Roadmap
- **What Sets SiteSpeak 2.0 Apart:**
  - Deep Voice Agent API integration (not a chatbot).
  - Built-in Simulation Studio with 6 automated industrial scenarios.
  - End-to-end workflow from field voice to OSHA compliance and Digital Twin schematic.
- **Roadmap:**
  - Wearable BLE bone-conduction headset support.
  - Computer vision hazard verification.
  - Multilingual voice streaming for international crews.
