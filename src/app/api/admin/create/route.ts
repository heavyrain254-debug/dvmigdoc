import { NextResponse } from 'next/server';
import db from '../../../../lib/db';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (cookieStore.get('admin_auth')?.value !== 'true') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { clientName, internalClientId } = await request.json();

    if (!clientName || !internalClientId) {
      return NextResponse.json({ error: 'Name and Internal ID are required' }, { status: 400 });
    }

    // Check if the Internal ID is already used to prevent duplicates
    const [existing]: any = await db.query('SELECT id FROM submissions WHERE internal_client_id = ?', [internalClientId]);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'This Internal ID is already in use. Please choose another.' }, { status: 400 });
    }
    
    // Generate a secure, random token for the URL
    const token = crypto.randomUUID();

    // Insert the new row
    await db.query(
      `INSERT INTO submissions (token, client_name, internal_client_id, data, status) VALUES (?, ?, ?, ?, 'DRAFT')`,
      [token, clientName, internalClientId, JSON.stringify({})]
    );

    return NextResponse.json({ success: true, token });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create link' }, { status: 500 });
  }
}
