import { NextResponse } from 'next/server';
import { db, ensureDbInitialized } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  try {
    await ensureDbInitialized();
    const { nodeId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    
    // Fetch node details
    const nodeResult = await db.execute({
      sql: `SELECT * FROM sensor_nodes WHERE node_id = ?`,
      args: [nodeId]
    });

    if (nodeResult.rows.length === 0) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }
    
    // Fetch recent readings
    const readingsResult = await db.execute({
      sql: `SELECT * FROM sensor_readings WHERE node_id = ? ORDER BY timestamp DESC LIMIT ?`,
      args: [nodeId, limit]
    });

    return NextResponse.json({
      node: nodeResult.rows[0],
      readings: readingsResult.rows
    });
  } catch (error) {
    console.error(`Error fetching readings for node:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
