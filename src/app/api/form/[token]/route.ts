import { NextResponse } from 'next/server';
import db from '../../../../lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const [rows]: any = await db.query('SELECT status, data FROM submissions WHERE token = ?', [token]);
    if (rows.length === 0) return NextResponse.json({ status: 'DRAFT', data: {} });
    return NextResponse.json({
      status: rows[0].status,
      data: typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await request.json();
  try {
    await db.query(
      `INSERT INTO submissions (token, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = ?`,
      [token, JSON.stringify(body.data), JSON.stringify(body.data)]
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
