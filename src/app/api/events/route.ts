import { NextResponse } from 'next/server';
import { getEvents } from '@/lib/events';
import { EventType } from '@/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('nodeId') || undefined;
    const eventType = (searchParams.get('eventType') as EventType) || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;

    const events = await getEvents({
      nodeId,
      eventType,
      limit,
      from,
      to
    });

    return NextResponse.json({ data: events });
  } catch (error) {
    console.error('Error in GET /api/events:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}