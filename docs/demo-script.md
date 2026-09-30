# SiteSpeak 2.0 — Official 150-Second Demo Recording Script
**Target Video Duration:** 2 minutes 30 seconds (150 seconds)  
**Tools to Record:** OBS Studio, Loom, or Windows Game Bar (`Win + Alt + R`)

---

## 🎬 Pre-Recording Checklist
1. **Ensure Backend & Frontend are running:**
   - Backend: `http://localhost:8787`
   - Frontend: `http://localhost:5173`
2. **Microphone Setup:** Test your mic or use the built-in **Simulation Studio (Tab 5)** if you prefer zero-mic automated execution during recording!
3. **Browser Window:** Maximize or set browser to 1920×1080 resolution.
4. **Tab Preparation:** Open `http://localhost:5173` on Tab 1 (Field Voice Console).

---

## ⏱️ Second-by-Second Video Timeline

### 0:00 – 0:25 | The Hook: "Paperwork takes 20 minutes. Spills don't wait."
- **Visual:** Show the sleek SiteSpeak 2.0 interface. Pan briefly across the Digital Twin facility schematic.
- **Spoken Narration (Voiceover):**
  > "In heavy industry, construction, and chemical manufacturing, workers wear heavy gloves and face high-stress emergencies. Filing an incident report takes 20 minutes of paper logs or noisy radio calls. But toxic spills don't wait.
  > This is **SiteSpeak 2.0**—an autonomous hands-free industrial safety voice agent built on the **AssemblyAI Voice Agent API**."

---

### 0:25 – 1:15 | Live Voice Turn-Taking & Tool Execution
- **Visual:** On Tab 1 (Field Console), click the large microphone button (or run Scenario 1 in Simulation Studio).
- **Spoken to Agent:**
  > *"There is a chemical spill near Bay 3! One person slipped, and there is a strong ammonia smell!"*
- **What happens on screen (Point camera/mouse here):**
  - Live waveform visualizer animates with streaming audio.
  - Partial transcript appears in real-time.
  - Sub-second tool cards pop up in the **Live Tool Pipeline**:
    1. `lookup_site("bay 3")` → Resolves to North Yard Bay 3.
    2. `create_incident_draft` → Opens draft record #INC-...
    3. `assess_hazmat_protocol("ammonia")` → Retrieves UN 1005, Level B vapor suit, 100m evacuation perimeter.
- **Agent Voice Response (Heard aloud):**
  > *"Advising immediate 100-meter evacuation perimeter and Level B vapor protection for ammonia. Nearest eyewash is at Column B2. Is anyone injured?"*
- **Spoken Follow-up to Agent:**
  > *"One worker has a wrist contusion, no ambulance needed yet."*
- **What happens on screen:**
  - `update_incident` fires, logging injuries and severity.
  - `add_followup` queues HAZMAT containment and First Aid dispatch.
  - `file_incident` seals the report.

---

### 1:15 – 1:45 | Interactive Digital Twin & OSHA-301 Compliance
- **Visual:** Click Tab 2 (**Digital Twin Schematic**).
  - Show the live SVG factory floorplan.
  - Highlight the glowing, pulsing red hazard marker placed directly at Bay 3 with the 100m evacuation radius.
  - Hover over the nearest Eyewash Station and Spill Kit markers.
- **Visual:** Switch to Tab 3 (**Supervisor Command**).
  - Click on the newly filed incident.
  - Click the **"Generate OSHA Form 301"** button.
  - Show the official, certified OSHA Standard 1904 Form 301 modal populated with injury details, chemical substance, and timestamps.
- **Spoken Narration:**
  > "SiteSpeak doesn't just transcribe—it grounds information visually. The Digital Twin immediately plots the hazard and safe corridors. And for compliance officers, natural field speech is instantly converted into an official OSHA Standard 1904 Form 301 document with one click."

---

### 1:45 – 2:15 | Emergency Broadcast Siren & HAZMAT Compass
- **Visual:** Click Tab 4 (**HAZMAT Compass**).
  - Show the dynamic chemical SDS directory (Ammonia, Sulfuric Acid, Chlorine, Diesel).
  - Trigger or showcase the **Emergency Broadcast Siren**.
  - Show the top red flashing emergency banner and hear the industrial alarm audio.
- **Visual:** Click Tab 5 (**Simulation Studio**).
  - Show the 6 pre-built multi-turn industrial scenarios and synthetic machinery background noise generator.
- **Spoken Narration:**
  > "For critical catastrophes, SiteSpeak triggers site-wide emergency broadcast sirens and facility evacuation banners. And with our built-in Simulation Studio, safety teams can stress-test 6 industrial scenarios under synthetic ambient noise."

---

### 2:15 – 2:30 | Architecture & Conclusion
- **Visual:** Show the architecture diagram from the README or presentation deck.
- **Spoken Narration:**
  > "SiteSpeak connects to AssemblyAI's Voice Agent API over a single WebSocket—handling Universal-3 Pro STT, barge-in turn-taking, and managed LLM routing. Our Fastify backend mints single-use tokens and audits every tool call with millisecond precision.
  > Hands-free, instant, and compliant. SiteSpeak 2.0 keeps workers safe when every second counts. Thank you!"

---

## 💡 Pro-Tips for Recording
- Keep background noise low if speaking live, or use the **Simulation Studio** (Tab 5) which sends automated prompts and executes all server tools seamlessly!
- Use 1080p resolution.
- Upload to **YouTube (Unlisted or Public)** or **Loom**, and paste the link into the submission form.
