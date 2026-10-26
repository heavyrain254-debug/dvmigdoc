import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { password } = await request.json();
  if (password === process.env.ADMIN_PASSWORD) {
    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_auth', 'true', { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    return response;
  }
  return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
}
