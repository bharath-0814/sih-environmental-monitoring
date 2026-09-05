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

    if (body.resolved !== undefined) {
      await db.execute({
        sql: 'UPDATE alerts SET resolved = ? WHERE id = ?',
        args: [body.resolved ? 1 : 0, id]
      });
      return NextResponse.json({ success: true, message: 'Alert updated' });
    }

    return NextResponse.json({ error: 'No actionable fields provided' }, { status: 400 });
  } catch (error) {
    console.error('Error updating alert:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
