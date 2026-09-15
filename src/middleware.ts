import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const jwtSecretRaw = process.env.JWT_SECRET;
if (!jwtSecretRaw || jwtSecretRaw.length < 32) {
  throw new Error('FATAL: JWT_SECRET environment variable is missing or less than 32 characters.');
}
const JWT_SECRET = new TextEncoder().encode(jwtSecretRaw);

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
  // Automatically redirect to tenant-specific modern responsive views so PWA and bookmarks render the correct mobile layout
  if (
    pathname.startsWith('/admin') ||
    pathname === '/pos' ||
    pathname === '/kitchen'
  ) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const lastStoreSlug = request.cookies.get('last_store_slug')?.value;
    let targetSlug = lastStoreSlug || 'lung-pa';

    if (!token) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const user = payload as unknown as SessionPayload;
      if (user.storeSlug) {
        targetSlug = user.storeSlug;
      }
    } catch (err) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (pathname === '/pos') {
      return NextResponse.redirect(new URL(`/r/${targetSlug}/pos`, request.url));
    }
    if (pathname === '/kitchen') {
      return NextResponse.redirect(new URL(`/r/${targetSlug}/kitchen`, request.url));
    }
    if (pathname.startsWith('/admin/')) {
      const sub = pathname.replace('/admin/', '');
      return NextResponse.redirect(new URL(`/r/${targetSlug}/admin/${sub}`, request.url));
    }
  }

  // 5. Tenant API Protection (/api/r/[slug]/*)
  const apiMatch = pathname.match(/^\/api\/r\/([^/]+)\/(.+)$/);
  if (apiMatch) {
    if (request.method === 'OPTIONS') {
      return NextResponse.next();
    }

    const slug = apiMatch[1];
    const subPath = apiMatch[2];
    const method = request.method;

    // Whitelist public endpoints for customer tables, SSE stream, and webhooks
    const isPublic =
      subPath === 'settings/public' ||
      (subPath === 'menu' && method === 'GET') ||
      (subPath.startsWith('menu/') && method === 'GET') ||
      (subPath.startsWith('tables/') && method === 'GET') ||
      (subPath === 'orders' && (method === 'GET' || method === 'POST')) ||
      (subPath === 'orders/verify-slip' && method === 'POST') ||
      (subPath === 'orders/notify-transfer' && method === 'POST') ||
      (subPath === 'service-call' && method === 'POST') ||
      (subPath === 'stream' && method === 'GET') ||
      (subPath === 'promotions' && method === 'GET') ||
      subPath.startsWith('webhooks/');

    if (!isPublic) {
      // Require authenticated staff token for all modifying/administrative API routes
      const token = request.cookies.get(COOKIE_NAME)?.value;
      if (!token) {
        return NextResponse.json(
          { error: 'Unauthorized: Staff session required' },
          { status: 401 }
        );
      }

      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const user = payload as unknown as SessionPayload;
        if (user.role !== 'SUPER_ADMIN' && user.storeSlug !== slug) {
          return NextResponse.json(
            { error: 'Forbidden: You do not have access to this store' },
            { status: 403 }
          );
        }
      } catch (err) {
        return NextResponse.json(
          { error: 'Unauthorized: Invalid session token' },
          { status: 401 }
        );
      }
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
    '/api/r/:slug/:path*',
  ],
};
