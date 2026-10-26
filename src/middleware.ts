import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isAuth = request.cookies.get('admin_auth')?.value === 'true';
  const isDashboard = request.nextUrl.pathname.startsWith('/admin/dashboard');
  const isLoginPage = request.nextUrl.pathname === '/admin';

  if (isDashboard && !isAuth) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  if (isLoginPage && isAuth) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Exact matching for the routes
  matcher: ['/admin', '/admin/dashboard'],
};
