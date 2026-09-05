import { NextResponse } from 'next/server';
import { db, ensureDbInitialized } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized();
    const { id } = await params;
    const body = await request.json();

    if (body.status !== undefined || body.resolved !== undefined) {
      let resolvedVal = body.resolved;
      let statusVal = body.status;

      if (statusVal === 'RESOLVED') {
        resolvedVal = 1;
      } else if (statusVal === 'OPEN' || statusVal === 'ACKNOWLEDGED') {
        resolvedVal = 0;
      } else if (resolvedVal !== undefined) {
        statusVal = resolvedVal ? 'RESOLVED' : 'OPEN';
        resolvedVal = resolvedVal ? 1 : 0;
      }

      await db.execute({
        sql: 'UPDATE alerts SET status = ?, resolved = ? WHERE id = ?',
        args: [statusVal || 'OPEN', resolvedVal ?? 0, id]
      });
      return NextResponse.json({ success: true, message: 'Alert updated' });
    }

    return NextResponse.json({ error: 'No actionable fields provided' }, { status: 400 });
  } catch (error) {
    console.error('Error updating alert:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
