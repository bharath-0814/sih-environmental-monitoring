import { NextResponse } from 'next/server';
import { db, ensureDbInitialized } from '@/lib/db';
import { SensorPayload } from '@/types';
import { evaluateAndTriggerAlerts } from '@/lib/alerts';

export async function POST(request: Request) {
  try {
    // 1. RATE LIMITING / ABUSE PROTECTION (Payload size check)
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 10240) { // 10KB limit
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    // 2. DEVICE AUTHENTICATION
    const expectedKey = process.env.SENSOR_INGESTION_API_KEY;
    if (expectedKey) {
      const providedKey = request.headers.get('x-api-key');
      if (providedKey !== expectedKey) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === 'production') {
      console.warn('WARNING: SENSOR_INGESTION_API_KEY is not set in production!');
    }

    await ensureDbInitialized();
    const body: SensorPayload = await request.json();

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // 3. NODE IDENTITY RESOLUTION
    let nodeId = body.node_id || request.headers.get('x-node-id');
    if (!nodeId) {
      if (process.env.NODE_ENV === 'development') {
        nodeId = 'node-01'; // Fallback for local development testing
      } else {
        return NextResponse.json({ error: 'Missing Node ID' }, { status: 400 });
      }
    }

    // Normalize payload to canonical format
    const canonical = {
      waterDistanceCm: body.water_distance ?? body.waterDistance,
      rainSensorRaw: body.rain_sensor ?? body.rainSensor ?? 0,
      rainGaugeTips: body.rain_tips ?? body.rainGaugeTips ?? 0,
      soilMoistureRaw: body.soil_moisture ?? body.soilMoisture ?? 0,
      temperatureC: body.temperature,
      humidityPct: body.humidity
    };

    // Basic validation & rejection of non-numeric data
    if (
      canonical.waterDistanceCm === undefined || isNaN(canonical.waterDistanceCm) ||
      canonical.temperatureC === undefined || isNaN(canonical.temperatureC) ||
      canonical.humidityPct === undefined || isNaN(canonical.humidityPct)
    ) {
      return NextResponse.json({ error: 'Missing or invalid required fields' }, { status: 400 });
    }

    // Ensure the node exists in sensor_nodes
    await db.execute({
      sql: `INSERT OR IGNORE INTO sensor_nodes (node_id, name, location_name, status) VALUES (?, ?, ?, ?)`,
      args: [nodeId, `Node ${nodeId}`, 'Unknown Location', 'active']
    });

    // Store reading in db
    await db.execute({
      sql: `INSERT INTO sensor_readings (
              node_id, water_distance_cm, rain_sensor_raw, rain_gauge_tips, 
              soil_moisture_raw, temperature_c, humidity_pct
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        nodeId,
        canonical.waterDistanceCm,
        canonical.rainSensorRaw,
        canonical.rainGaugeTips,
        canonical.soilMoistureRaw,
        canonical.temperatureC,
        canonical.humidityPct
      ]
    });
    
    // Update last_seen on the node
    await db.execute({
      sql: `UPDATE sensor_nodes SET last_seen = CURRENT_TIMESTAMP WHERE node_id = ?`,
      args: [nodeId]
    });

    // 4. REAL BACKEND ALERT ENGINE
    await evaluateAndTriggerAlerts(nodeId, canonical as any);

    return NextResponse.json({ success: true, message: 'Reading recorded' });
  } catch (error) {
    console.error('Error in POST /api/sensors:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
