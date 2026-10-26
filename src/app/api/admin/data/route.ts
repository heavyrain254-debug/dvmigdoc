import { NextResponse } from 'next/server';
import db from '../../../../lib/db';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('admin_auth');

  if (authCookie?.value !== 'true') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const downloadToken = url.searchParams.get('download');

  if (downloadToken) {
    const [rows]: any = await db.query('SELECT pdf_data FROM submissions WHERE token = ?', [downloadToken]);
    if (rows.length > 0 && rows[0].pdf_data) {
      return new NextResponse(rows[0].pdf_data, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Migration_${downloadToken}.pdf"`
        }
      });
    }
    return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
  }

  const [rows]: any = await db.query('SELECT token, client_name, internal_client_id, status, updated_at FROM submissions ORDER BY updated_at DESC');
  return NextResponse.json(rows);
}
