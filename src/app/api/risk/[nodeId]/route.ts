import { NextResponse } from 'next/server';
import { db, ensureDbInitialized } from '@/lib/db';
import { assessNodeRisk } from '@/lib/risk-engine';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  try {
    await ensureDbInitialized();
    const { nodeId } = await params;

    // Check if node exists
    const nodeResult = await db.execute({
      sql: 'SELECT * FROM sensor_nodes WHERE node_id = ?',
      args: [nodeId]
    });

    if (nodeResult.rows.length === 0) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    const assessment = await assessNodeRisk(nodeId);

    return NextResponse.json({
      node: nodeResult.rows[0],
      assessment
    });
  } catch (error) {
    console.error('Error in GET /api/risk/[nodeId]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}