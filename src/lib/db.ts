import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL || 'file:./local.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

export const db = createClient({
  url,
  authToken,
});

// Helper to initialize schema for local testing
export async function initDb() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS sensor_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      node_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      location_name TEXT,
      latitude REAL,
      longitude REAL,
      status TEXT DEFAULT 'active',
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sensor_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      node_id TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      water_distance_cm REAL,
      rain_sensor_raw INTEGER,
      rain_gauge_tips INTEGER,
      soil_moisture_raw INTEGER,
      temperature_c REAL,
      humidity_pct REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(node_id) REFERENCES sensor_nodes(node_id)
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      node_id TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'OPEN',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved BOOLEAN DEFAULT 0,
      FOREIGN KEY(node_id) REFERENCES sensor_nodes(node_id)
    );
    
    -- Insert a demo node if none exists
    INSERT OR IGNORE INTO sensor_nodes (node_id, name, location_name, latitude, longitude, status) 
    VALUES ('node-01', 'Demo Node 1', 'River Station Alpha', 28.6139, 77.2090, 'active');
  `);

  // Migration: Ensure status column exists if alerts table was previously created without it
  try {
    await db.execute(`ALTER TABLE alerts ADD COLUMN status TEXT DEFAULT 'OPEN'`);
  } catch {
    // Column already exists or table has it
  }
}

let initPromise: Promise<void> | null = null;

export function ensureDbInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = initDb().catch((err) => {
      // If initialization fails, reset the promise so we can try again
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}
