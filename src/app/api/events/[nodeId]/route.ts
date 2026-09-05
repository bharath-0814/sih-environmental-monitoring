import { NextResponse } from 'next/server';
import { getEvents } from '@/lib/events';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  try {
    const { nodeId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;

    const events = await getEvents({
      nodeId,
      limit,
      from,
      to
    });

    return NextResponse.json({ data: events });
  } catch (error) {
    console.error('Error in GET /api/events/[nodeId]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}