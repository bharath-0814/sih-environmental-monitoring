import { NextResponse } from 'next/server';
import { db, ensureDbInitialized } from '@/lib/db';

export async function GET(request: Request) {
  try {
    await ensureDbInitialized();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const severity = searchParams.get('severity');
    const resolved = searchParams.get('resolved');

    let sql = 'SELECT * FROM alerts';
    let conditions = [];
    let args = [];

    if (severity) {
      conditions.push('severity = ?');
      args.push(severity);
    }
    
    if (resolved !== null) {
      conditions.push('resolved = ?');
      args.push(resolved === 'true' ? 1 : 0);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    args.push(limit);

    const result = await db.execute({ sql, args });
    return NextResponse.json({ data: result.rows });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
