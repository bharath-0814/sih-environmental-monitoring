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
    
    // Fetch recent readings with optional time range
    const range = searchParams.get('range');
    let sql = 'SELECT * FROM sensor_readings WHERE node_id = ?';
    const args: any[] = [nodeId];

    if (range) {
      let durationMs = 24 * 60 * 60 * 1000; // default 24h
      if (range === '15m') durationMs = 15 * 60 * 1000;
      else if (range === '1h') durationMs = 60 * 60 * 1000;
      else if (range === '6h') durationMs = 6 * 60 * 60 * 1000;
      else if (range === '24h') durationMs = 24 * 60 * 60 * 1000;

      const fromIso = new Date(Date.now() - durationMs).toISOString();
      sql += ' AND timestamp >= ? ORDER BY timestamp ASC';
      args.push(fromIso);
    } else {
      sql += ' ORDER BY timestamp DESC LIMIT ?';
      args.push(limit);
    }

    const readingsResult = await db.execute({ sql, args });

    // If query was ordered DESC (when no range specified), readings are newest first.
    // If query had range, it's ordered ASC for charts, but let's provide readings array.
    return NextResponse.json({
      node: nodeResult.rows[0],
      readings: readingsResult.rows
    });
  } catch (error) {
    console.error(`Error fetching readings for node:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
