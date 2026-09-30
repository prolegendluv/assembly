import { DatabaseSync } from "node:sqlite";

let db: DatabaseSync | null = null;

export function getDb(path?: string): DatabaseSync {
    if (db) return db;
    const dbPath = path ?? process.env.DB_PATH ?? "./sitespeak.db";
    db = new DatabaseSync(dbPath);
    db.exec(`PRAGMA journal_mode = WAL;`);
    db.exec(`
    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      zone TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      injuries_count INTEGER DEFAULT 0,
      injuries_desc TEXT DEFAULT '',
      severity TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'draft',
      osha_reportable INTEGER DEFAULT 0,
      osha_code TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      filed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS followups (
      id TEXT PRIMARY KEY,
      incident_id TEXT NOT NULL REFERENCES incidents(id),
      action TEXT NOT NULL,
      assignee_role TEXT DEFAULT '',
      due_in_hours REAL,
      done INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS tool_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT DEFAULT '',
      tool TEXT NOT NULL,
      args TEXT NOT NULL,
      result TEXT NOT NULL,
      ms INTEGER DEFAULT 0,
      at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sites (
      site_id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      zones TEXT NOT NULL,
      schematic TEXT DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS hazmat_protocols (
      id TEXT PRIMARY KEY,
      chemical_name TEXT NOT NULL,
      synonyms TEXT NOT NULL,
      un_number TEXT NOT NULL,
      hazard_class TEXT NOT NULL,
      ppe_required TEXT NOT NULL,
      evacuation_radius_meters INTEGER NOT NULL,
      containment_procedure TEXT NOT NULL,
      first_aid_action TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS emergency_equipment (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      zone TEXT NOT NULL,
      equipment_type TEXT NOT NULL,
      location_detail TEXT NOT NULL,
      status TEXT DEFAULT 'operational',
      last_inspected TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS emergency_broadcasts (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      zone TEXT,
      reason TEXT NOT NULL,
      evacuation_required INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      triggered_at TEXT DEFAULT (datetime('now')),
      cleared_at TEXT
    );
    CREATE TABLE IF NOT EXISTS prompt_suggestions (
      id TEXT PRIMARY KEY,
      icon TEXT NOT NULL,
      tag TEXT NOT NULL,
      text TEXT NOT NULL,
      category TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS simulation_scenarios (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      severity_badge TEXT NOT NULL,
      description TEXT NOT NULL,
      steps TEXT NOT NULL
    );
  `);
    try {
        db.exec(`ALTER TABLE sites ADD COLUMN schematic TEXT DEFAULT '[]';`);
    } catch { }
    try {
        db.exec(`ALTER TABLE incidents ADD COLUMN osha_reportable INTEGER DEFAULT 0;`);
    } catch { }
    try {
        db.exec(`ALTER TABLE incidents ADD COLUMN osha_code TEXT DEFAULT '';`);
    } catch { }
    return db;
}

export function uid(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}