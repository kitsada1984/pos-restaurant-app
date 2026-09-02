import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-saas-restaurant-pos-jwt-key-2026-secure'
);

const COOKIE_NAME = 'pos_auth_token';

interface SessionPayload {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'STORE_OWNER' | 'STORE_STAFF';
  storeId?: string | null;
  storeSlug?: string | null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Platform Admin Routes
  if (pathname.startsWith('/platform-admin')) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const user = payload as unknown as SessionPayload;
      if (user.role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } catch (err) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 2. Store Owner Dashboard Routes
  if (pathname.startsWith('/store')) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const user = payload as unknown as SessionPayload;
      if (user.role !== 'STORE_OWNER' && user.role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } catch (err) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 3. Tenant Backoffice, POS, and Kitchen Routes (/r/[slug]/admin, /r/[slug]/pos, /r/[slug]/kitchen)
  const tenantMatch = pathname.match(/^\/r\/([^/]+)\/(admin|pos|kitchen)/);
  if (tenantMatch) {
    const slug = tenantMatch[1];
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const user = payload as unknown as SessionPayload;
      // Allow if Super Admin OR if storeSlug matches
      if (user.role !== 'SUPER_ADMIN' && user.storeSlug !== slug) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } catch (err) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 4. Legacy Global Backoffice / POS / Kitchen Routes (/admin, /pos, /kitchen)
  if (
    pathname.startsWith('/admin') ||
    pathname === '/pos' ||
    pathname === '/kitchen'
  ) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    try {
      await jwtVerify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/platform-admin/:path*',
    '/store/:path*',
    '/r/:slug/admin/:path*',
    '/r/:slug/pos',
    '/r/:slug/kitchen',
    '/admin/:path*',
    '/pos',
    '/kitchen',
  ],
};
