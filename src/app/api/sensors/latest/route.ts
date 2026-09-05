import { NextResponse } from 'next/server';
import { db, ensureDbInitialized } from '@/lib/db';

export async function GET() {
  try {
    await ensureDbInitialized();
    // Get the latest reading for each node
    // Using a simple subquery or group by since we want latest per node
    const result = await db.execute(`
      SELECT r.*, n.name, n.location_name, n.latitude, n.longitude, n.status 
      FROM sensor_readings r
      JOIN sensor_nodes n ON r.node_id = n.node_id
      WHERE r.timestamp = (
        SELECT MAX(timestamp) 
        FROM sensor_readings 
        WHERE node_id = r.node_id
      )
    `);

    return NextResponse.json({ data: result.rows });
  } catch (error) {
    console.error('Error fetching latest readings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
