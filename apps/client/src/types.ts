export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "draft" | "filed" | "cancelled" | "resolved";

export interface Incident {
    id: string;
    site_id: string;
    zone: string;
    category: string;
    description: string;
    injuries_count: number;
    injuries_desc: string;
    severity: IncidentSeverity;
    status: IncidentStatus;
    osha_reportable?: number;
    osha_code?: string;
    created_at: string;
    filed_at?: string | null;
}

export interface Followup {
    id: string;
    incident_id: string;
    action: string;
    assignee_role: string;
    due_in_hours: number;
    done: number;
}

export interface ToolAuditItem {
    id: number;
    session_id: string;
    tool: string;
    args: string;
    result: string;
    ms: number;
    at: string;
}

export interface StatsResponse {
    total: number;
    filed: number;
    oshaCount?: number;
    activeAlerts?: number;
    bySeverity: Array<{ severity: string; c: number }>;
    byCategory: Array<{ category: string; c: number }>;
}

export interface ToolEvent {
    id?: string;
    name: string;
    args: Record<string, any>;
    result?: Record<string, any>;
    at: string;
    ms?: number;
}

export interface HazmatProtocol {
    id: string;
    chemical_name: string;
    synonyms: string[];
    un_number: string;
    hazard_class: string;
    ppe_required: string;
    evacuation_radius_meters: number;
    containment_procedure: string;
    first_aid_action: string;
}

export interface EmergencyEquipment {
    id: string;
    site_id: string;
    zone: string;
    equipment_type: "spill_kit" | "eyewash_station" | "aed_defibrillator" | "fire_extinguisher" | "first_aid_box";
    location_detail: string;
    status: string;
    last_inspected?: string;
}

export interface EmergencyBroadcast {
    id: string;
    site_id: string;
    zone: string;
    reason: string;
    evacuation_required: number;
    status: "active" | "cleared";
    triggered_at: string;
    cleared_at?: string | null;
}

export interface OshaFormDoc {
    form_title: string;
    establishment_name: string;
    case_number: string;
    site: string;
    zone: string;
    date_of_incident: string;
    time_of_report: string;
    severity_classification: string;
    incident_category: string;
    description_of_event: string;
    injuries_recorded: number;
    injuries_notes: string;
    osha_standard_code: string;
    osha_reportable: boolean;
    corrective_actions: Array<{ action: string; assignee: string; completed: boolean }>;
    compliance_certification: string;
}
