import "dotenv/config";
import { getDb } from "./db.js";

export function seedDatabase() {
    const db = getDb();

    // 1. Sites with spatial schematic metadata
    const sites = [
        {
            site_id: "north-yard",
            label: "North Yard",
            zones: JSON.stringify(["bay 1", "bay 2", "bay 3", "dock 1", "gate A"]),
            schematic: JSON.stringify([
                { id: "bay 1", label: "Bay 1 - Machining", description: "Heavy fabrication, overhead crane", x: 40, y: 50, w: 180, h: 140, evacTarget: { x: 420, y: 440 } },
                { id: "bay 2", label: "Bay 2 - Electrical", description: "Substation 4, switchgears, transformers", x: 240, y: 50, w: 180, h: 140, evacTarget: { x: 420, y: 440 } },
                { id: "bay 3", label: "Bay 3 - Hazmat/Spill", description: "Chemical transfer, fuel staging, drums", x: 440, y: 50, w: 190, h: 140, evacTarget: { x: 420, y: 440 } },
                { id: "dock 1", label: "Dock 1 - Freight Yard", description: "Flatbed loading, heavy haulers, cranes", x: 40, y: 220, w: 280, h: 160, evacTarget: { x: 420, y: 440 } },
                { id: "gate A", label: "Gate A - Security", description: "Security post, guard checkpoint, badges", x: 350, y: 220, w: 280, h: 160, evacTarget: { x: 420, y: 440 } },
            ]),
        },
        {
            site_id: "warehouse-b",
            label: "Warehouse B",
            zones: JSON.stringify(["aisle 1", "aisle 2", "loading dock", "cold room"]),
            schematic: JSON.stringify([
                { id: "aisle 1", label: "Aisle 1 - High Bay", description: "Racks 1-12, automated stock pickers", x: 50, y: 50, w: 160, h: 220, evacTarget: { x: 520, y: 440 } },
                { id: "aisle 2", label: "Aisle 2 - Battery/Transit", description: "Forklift transit route, fast charging station", x: 230, y: 50, w: 160, h: 220, evacTarget: { x: 520, y: 440 } },
                { id: "cold room", label: "Cold Room - Ammonia Refrig", description: "Sub-zero storage, NH3 refrigerant circuits", x: 410, y: 50, w: 210, h: 130, evacTarget: { x: 520, y: 440 } },
                { id: "loading dock", label: "Loading Dock - Express Freight", description: "Bays 1-4 automated levelers, cross-dock", x: 410, y: 200, w: 210, h: 180, evacTarget: { x: 520, y: 440 } },
            ]),
        },
    ];

    for (const s of sites) {
        db.prepare(`INSERT OR REPLACE INTO sites (site_id, label, zones, schematic) VALUES (?, ?, ?, ?)`).run(
            s.site_id, s.label, s.zones, s.schematic
        );
    }

    // 2. HAZMAT Protocols
    const hazmatProtocols = [
        {
            id: "haz_ammonia",
            chemical_name: "Anhydrous Ammonia",
            synonyms: JSON.stringify(["ammonia", "nh3", "refrigerant gas", "anhydrous ammonia"]),
            un_number: "UN 1005",
            hazard_class: "Class 2.3 (Toxic Gas / Corrosive)",
            ppe_required: "Level B Vapor-Protective Suit, Full-Face SCBA, Butyl Chemical Gloves",
            evacuation_radius_meters: 100,
            containment_procedure: "Do not touch liquid. Apply water fog spray to knock down vapor plume. Isolate leak source if safe.",
            first_aid_action: "Move victim to fresh air immediately. Flush contaminated skin/eyes with water for at least 15 minutes. Administer 100% oxygen.",
        },
        {
            id: "haz_diesel",
            chemical_name: "Diesel Fuel / Hydrocarbons",
            synonyms: JSON.stringify(["diesel", "fuel", "gasoline", "motor oil", "petroleum"]),
            un_number: "UN 1202",
            hazard_class: "Class 3 (Flammable Liquid)",
            ppe_required: "Nitrile chemical gloves, splash goggles, organic vapor respirator mask",
            evacuation_radius_meters: 30,
            containment_procedure: "Eliminate ignition sources. Deploy hydrocarbon absorbent booms and pads. Cover sewer drains with spill mats.",
            first_aid_action: "Wash skin with soap and warm water. Remove saturated clothing. If swallowed, do NOT induce vomiting.",
        },
        {
            id: "haz_acid",
            chemical_name: "Sulfuric Acid (Battery Acid)",
            synonyms: JSON.stringify(["acid", "battery acid", "sulfuric acid", "electrolyte", "battery leak"]),
            un_number: "UN 1830",
            hazard_class: "Class 8 (Corrosive Liquid)",
            ppe_required: "Acid-resistant face shield, neoprene apron, heavy-duty butyl gloves, rubber boots",
            evacuation_radius_meters: 25,
            containment_procedure: "Neutralize carefully with sodium bicarbonate or lime. Absorb with acid-neutralizing absorbent vermiculite.",
            first_aid_action: "Flush skin and eyes immediately with copious water from eyewash/safety shower for minimum 20 minutes.",
        },
        {
            id: "haz_chlorine",
            chemical_name: "Chlorine Gas",
            synonyms: JSON.stringify(["chlorine", "bleach gas", "cl2", "water treatment chemical"]),
            un_number: "UN 1017",
            hazard_class: "Class 2.3 (Toxic Gas / Oxidizer)",
            ppe_required: "Level A Fully Encapsulating Vapor-Tight Suit, SCBA breathing apparatus",
            evacuation_radius_meters: 150,
            containment_procedure: "Evacuate upwind. Use Emergency Chlorine Kit B on cylinder valve. Never spray water directly on liquid chlorine leak.",
            first_aid_action: "Evacuate upwind into clean air. Maintain resting airway and deliver humidified oxygen if trained.",
        },
        {
            id: "haz_hydraulic",
            chemical_name: "Hydraulic Fluid / Synthetic Lubricant",
            synonyms: JSON.stringify(["hydraulic fluid", "hydraulic oil", "machine oil", "lubricant", "transmission fluid"]),
            un_number: "UN 1993",
            hazard_class: "Class 9 (Combustible / Slippage Hazard)",
            ppe_required: "Nitrile gloves, safety goggles, slip-resistant steel-toe boots",
            evacuation_radius_meters: 15,
            containment_procedure: "Surround with granular clay absorbent. Cordon area to prevent slip-and-fall injuries.",
            first_aid_action: "Wash contact area with soap and water. If injected under skin from high-pressure line, seek immediate surgical treatment.",
        },
    ];

    for (const h of hazmatProtocols) {
        db.prepare(`INSERT OR REPLACE INTO hazmat_protocols (id, chemical_name, synonyms, un_number, hazard_class, ppe_required, evacuation_radius_meters, containment_procedure, first_aid_action)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
            h.id, h.chemical_name, h.synonyms, h.un_number, h.hazard_class, h.ppe_required, h.evacuation_radius_meters, h.containment_procedure, h.first_aid_action
        );
    }

    // 3. Emergency Safety Equipment
    const equipment = [
        { id: "eq_spill_1", site_id: "north-yard", zone: "bay 3", equipment_type: "spill_kit", location_detail: "Mounted on Support Column C2 beside Bay 3 rolling door", status: "operational" },
        { id: "eq_spill_2", site_id: "north-yard", zone: "dock 1", equipment_type: "spill_kit", location_detail: "Adjacent to Dock 1 HAZMAT storage locker", status: "operational" },
        { id: "eq_eyewash_1", site_id: "north-yard", zone: "bay 1", equipment_type: "eyewash_station", location_detail: "Safety Station 101, left of tool crib", status: "operational" },
        { id: "eq_aed_1", site_id: "north-yard", zone: "gate A", equipment_type: "aed_defibrillator", location_detail: "Guardhouse wall mount, Main Gate A entrance", status: "operational" },
        { id: "eq_fire_1", site_id: "north-yard", zone: "bay 2", equipment_type: "fire_extinguisher", location_detail: "Class ABC Extinguisher at Bay 2 electrical panel", status: "operational" },
        { id: "eq_spill_3", site_id: "warehouse-b", zone: "loading dock", equipment_type: "spill_kit", location_detail: "Loading Dock Bay 4 staging area", status: "operational" },
        { id: "eq_eyewash_2", site_id: "warehouse-b", zone: "cold room", equipment_type: "eyewash_station", location_detail: "Exterior airlock entrance of Cold Room", status: "operational" },
        { id: "eq_aed_2", site_id: "warehouse-b", zone: "aisle 1", equipment_type: "aed_defibrillator", location_detail: "Supervisor desk kiosk at start of Aisle 1", status: "operational" },
        { id: "eq_fire_2", site_id: "warehouse-b", zone: "aisle 2", equipment_type: "fire_extinguisher", location_detail: "Battery recharging station aisle 2", status: "operational" },
        { id: "eq_firstaid_1", site_id: "north-yard", zone: "bay 3", equipment_type: "first_aid_box", location_detail: "First Aid Kit #3 mounted on Bay 3 Supervisor Booth", status: "operational" },
    ];

    for (const eq of equipment) {
        db.prepare(`INSERT OR REPLACE INTO emergency_equipment (id, site_id, zone, equipment_type, location_detail, status)
            VALUES (?, ?, ?, ?, ?, ?)`).run(
            eq.id, eq.site_id, eq.zone, eq.equipment_type, eq.location_detail, eq.status
        );
    }

    // 4. Suggested Field Voice Prompts (dynamic prompt suggestions)
    const promptSuggestions = [
        { id: "p1", icon: "🧪", tag: "HAZMAT Spill", text: "There's a chemical spill near bay 3 in the North Yard, strong ammonia vapor smell, one person slipped!", category: "hazmat" },
        { id: "p2", icon: "⚡", tag: "Electrical Fire", text: "Emergency! Substation 4 in Bay 2 has sparks shooting everywhere and the transformer is smoking!", category: "fire" },
        { id: "p3", icon: "🧯", tag: "Equipment Query", text: "SiteSpeak, where is the nearest chemical spill kit to Bay 3?", category: "equipment" },
        { id: "p4", icon: "🚜", tag: "Near Miss", text: "Forklift passed within a meter of the pedestrian walkway at dock 1, speed was excessive.", category: "near_miss" },
        { id: "p5", icon: "📊", tag: "Site Status", text: "What is the safety status of North Yard right now?", category: "query" },
        { id: "p6", icon: "❌", tag: "False Alarm", text: "We had a leak under the hydraulic press at dock 1, but false alarm, it's just condensation water.", category: "cancel" },
    ];

    for (const p of promptSuggestions) {
        db.prepare(`INSERT OR REPLACE INTO prompt_suggestions (id, icon, tag, text, category) VALUES (?, ?, ?, ?, ?)`).run(
            p.id, p.icon, p.tag, p.text, p.category
        );
    }

    // 5. Simulation Scenarios
    const scenarios = [
        {
            id: "hazmat_spill",
            title: "Hazardous Chemical Spill & Slip",
            category: "HAZMAT & Injury",
            severity_badge: "High Severity",
            description: "Ammonia vapor spill in Bay 3 with slip injury; tests HAZMAT SDS protocol, injury tracking, and first-aid dispatch.",
            steps: JSON.stringify([
                { speaker: "worker", text: "Chemical spill near bay 3! One person slipped, and there's a strong ammonia vapor smell!", pauseMs: 1400 },
                { speaker: "system", text: "Executing lookup_site and create_incident_draft for North Yard, Bay 3", toolCall: { name: "create_incident_draft", args: { site_id: "north-yard", zone: "bay 3", category: "spill", description: "Ammonia vapor chemical spill near bay 3, worker slipped" } } },
                { speaker: "system", text: "Assessing HAZMAT SDS Protocol for Anhydrous Ammonia", toolCall: { name: "assess_hazmat_protocol", args: { chemical_or_material: "ammonia", estimated_volume: "5 gallons" } } },
                { speaker: "agent", text: "Draft opened for North Yard Bay 3. Ammonia protocol active: evacuate 100 meters immediately. Mandatory Level B vapor suit required. Is the person who slipped injured?", pauseMs: 1800 },
                { speaker: "worker", text: "Yes, his left wrist is swollen and bruised, but he is conscious and breathing.", pauseMs: 1400 },
                { speaker: "system", text: "Updating incident: 1 injury, wrist contusion, severity high", toolCall: { name: "update_incident", args: { incident_id: "__CURRENT_INCIDENT__", injuries_count: 1, injuries_desc: "Left wrist swelling and bruising from slip", severity: "high" } } },
                { speaker: "system", text: "Dispatching first aid followup and HAZMAT containment crew", toolCall: { name: "add_followup", args: { incident_id: "__CURRENT_INCIDENT__", action: "Escort worker to first-aid clinic; deploy ammonia neutralizing fog", assignee_role: "hazmat_crew", due_in_hours: 1 } } },
                { speaker: "system", text: "Filing official OSHA reportable incident", toolCall: { name: "file_incident", args: { incident_id: "__CURRENT_INCIDENT__" } } },
                { speaker: "agent", text: "Incident filed as OSHA Recordable. HAZMAT containment dispatched, and first-aid is en route to Bay 3. Maintain 100 meter perimeter.", pauseMs: 1000 },
            ]),
        },
        {
            id: "electrical_fire",
            title: "Substation Electrical Fire & Evacuation Siren",
            category: "Critical Emergency",
            severity_badge: "Critical",
            description: "Arcing sparks and electrical smoke at Bay 2 substation; triggers automated facility emergency broadcast alarm.",
            steps: JSON.stringify([
                { speaker: "worker", text: "Emergency! Substation 4 in Bay 2 has sparks shooting everywhere and heavy black smoke! The transformer is on fire!", pauseMs: 1500 },
                { speaker: "system", text: "Creating incident draft: electrical fire at Bay 2", toolCall: { name: "create_incident_draft", args: { site_id: "north-yard", zone: "bay 2", category: "fire", description: "Substation 4 electrical transformer arcing and catching fire" } } },
                { speaker: "system", text: "Triggering facility emergency broadcast alarm & evacuation order", toolCall: { name: "trigger_emergency_broadcast", args: { site_id: "north-yard", zone: "bay 2", reason: "Transformer fire at Substation 4. Severe explosion hazard.", evacuation_required: true } } },
                { speaker: "agent", text: "CRITICAL ALERT: Emergency broadcast triggered for North Yard Bay 2. Evacuate immediately to Primary Muster Point! Do NOT use water on electrical fire. Are all personnel accounted for?", pauseMs: 1600 },
                { speaker: "worker", text: "Yes, both technicians got out through Gate A, no injuries so far!", pauseMs: 1300 },
                { speaker: "system", text: "Updating incident severity to critical and dispatching fire marshal", toolCall: { name: "update_incident", args: { incident_id: "__CURRENT_INCIDENT__", severity: "critical", injuries_count: 0 } } },
                { speaker: "system", text: "Filing incident with emergency status", toolCall: { name: "file_incident", args: { incident_id: "__CURRENT_INCIDENT__" } } },
                { speaker: "agent", text: "Incident filed as critical. Main electrical feed tripped remotely. Stand clear of Bay 2 perimeter.", pauseMs: 1000 },
            ]),
        },
        {
            id: "equipment_finder",
            title: "Worker Safety Equipment Assistance",
            category: "Equipment Query",
            severity_badge: "Assistance",
            description: "Worker requests the nearest spill kit and eyewash station; agent locates equipment and gives exact column directions.",
            steps: JSON.stringify([
                { speaker: "worker", text: "Hey SiteSpeak, where is the closest chemical spill kit to Bay 3?", pauseMs: 1300 },
                { speaker: "system", text: "Finding emergency equipment: spill_kit near bay 3", toolCall: { name: "find_emergency_equipment", args: { equipment_type: "spill_kit", near_zone: "bay 3" } } },
                { speaker: "agent", text: "The nearest spill kit is mounted on Support Column C2 right beside the Bay 3 rolling door. Do you also need an eyewash station or safety shower?", pauseMs: 1400 },
                { speaker: "worker", text: "No, just the spill kit to clean up an oil drip before someone slips. Thanks!", pauseMs: 1200 },
                { speaker: "agent", text: "Understood. Remember to dispose of used absorbent pads in the designated yellow hazardous bin.", pauseMs: 1000 },
            ]),
        },
        {
            id: "false_alarm",
            title: "False Alarm Graceful Cancellation",
            category: "Edge Case",
            severity_badge: "Low",
            description: "Worker calls in a suspicious leak, but verifies it's condensation; agent cleanly voids draft with cancel_incident.",
            steps: JSON.stringify([
                { speaker: "worker", text: "We have a leak under the hydraulic press at dock 1.", pauseMs: 1400 },
                { speaker: "system", text: "Opening incident draft for dock 1", toolCall: { name: "create_incident_draft", args: { site_id: "north-yard", zone: "dock 1", category: "equipment", description: "Leak under hydraulic press at dock 1" } } },
                { speaker: "agent", text: "Draft opened for Dock 1 hydraulic press. Is oil leaking onto the floor, and is the press currently energized?", pauseMs: 1600 },
                { speaker: "worker", text: "Wait, false alarm! Never mind, it's just condensation water from the air conditioner duct overhead.", pauseMs: 1400 },
                { speaker: "system", text: "Calling cancel_incident to void draft", toolCall: { name: "cancel_incident", args: { incident_id: "__CURRENT_INCIDENT__", reason: "Condensation water from AC duct, no hydraulic leak" } } },
                { speaker: "agent", text: "Draft cancelled as false alarm. Good check on the AC condensation. Stay safe!", pauseMs: 1000 },
            ]),
        },
    ];

    for (const sc of scenarios) {
        db.prepare(`INSERT OR REPLACE INTO simulation_scenarios (id, title, category, severity_badge, description, steps)
            VALUES (?, ?, ?, ?, ?, ?)`).run(
            sc.id, sc.title, sc.category, sc.severity_badge, sc.description, sc.steps
        );
    }

    // 6. Incidents
    const samples = [
        { id: "inc_seed_1", site_id: "north-yard", zone: "bay 3", category: "spill", description: "Hydraulic fluid spill near pallet stack", injuries_count: 0, injuries_desc: "", severity: "medium", status: "filed", osha: 0, osha_code: "" },
        { id: "inc_seed_2", site_id: "north-yard", zone: "dock 1", category: "near_miss", description: "Forklift passed within a meter of pedestrian walkway", injuries_count: 0, injuries_desc: "", severity: "low", status: "filed", osha: 0, osha_code: "" },
        { id: "inc_seed_3", site_id: "warehouse-b", zone: "aisle 2", category: "fall", description: "Worker slipped on wet floor, ankle sprain", injuries_count: 1, injuries_desc: "ankle sprain", severity: "high", status: "filed", osha: 1, osha_code: "1904.7 - General Recording Criteria" },
        { id: "inc_seed_4", site_id: "warehouse-b", zone: "loading dock", category: "equipment", description: "Conveyor guard loose, rattling", injuries_count: 0, injuries_desc: "", severity: "medium", status: "filed", osha: 0, osha_code: "" },
        { id: "inc_seed_5", site_id: "north-yard", zone: "gate A", category: "electrical", description: "Exposed cable on temporary lighting rig", injuries_count: 0, injuries_desc: "", severity: "high", status: "filed", osha: 1, osha_code: "1904.7 - General Recording Criteria" },
        { id: "inc_seed_6", site_id: "warehouse-b", zone: "cold room", category: "near_miss", description: "Door latch stuck, worker inside for 2 minutes", injuries_count: 0, injuries_desc: "", severity: "medium", status: "filed", osha: 0, osha_code: "" },
    ];

    for (const s of samples) {
        db.prepare(`INSERT OR REPLACE INTO incidents (id, site_id, zone, category, description, injuries_count, injuries_desc, severity, status, osha_reportable, osha_code, filed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`)
            .run(s.id, s.site_id, s.zone, s.category, s.description, s.injuries_count, s.injuries_desc, s.severity, s.status, s.osha, s.osha_code);
    }

    db.prepare(`INSERT OR REPLACE INTO followups (id, incident_id, action, assignee_role, due_in_hours, done) VALUES ('fol_seed_1', 'inc_seed_1', 'Cordon bay 3 and absorb spill', 'maintenance', 2, 1)`).run();
    db.prepare(`INSERT OR REPLACE INTO followups (id, incident_id, action, assignee_role, due_in_hours, done) VALUES ('fol_seed_2', 'inc_seed_3', 'Escort worker to first-aid, file injury form', 'first-aid', 1, 0)`).run();

    console.log("Database successfully seeded with dynamic sites, HAZMAT protocols, equipment, prompts, and scenarios.");
}

// Auto-run if executed directly
if (process.argv[1]?.includes("seed")) {
    seedDatabase();
}