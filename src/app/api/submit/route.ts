import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, data, pdfBase64 } = body;

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    await db.query(
      `UPDATE submissions SET status = 'SUBMITTED', data = ?, pdf_data = ? WHERE token = ?`,
      [JSON.stringify(data), pdfBuffer, token]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
  }
}
