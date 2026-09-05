import { NextResponse } from 'next/server';
import { db, ensureDbInitialized } from '@/lib/db';
import { assessNodeRisk } from '@/lib/risk-engine';

export async function GET() {
  try {
    await ensureDbInitialized();
    
    // Fetch all known nodes
    const nodesResult = await db.execute('SELECT node_id FROM sensor_nodes');
    const nodeIds = nodesResult.rows.map((row: any) => row.node_id as string);

    // Assess risk for each node concurrently
    const assessments = await Promise.all(
      nodeIds.map(nodeId => assessNodeRisk(nodeId))
    );

    return NextResponse.json({ data: assessments });
  } catch (error) {
    console.error('Error in GET /api/risk:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}