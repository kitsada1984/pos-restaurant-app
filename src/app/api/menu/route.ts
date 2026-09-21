import { NextRequest } from 'next/server';
import { GET as tenantGET, POST as tenantPOST } from '../r/[slug]/menu/route';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return tenantGET(req, { params: { slug: 'lung-pa' } });
}

export async function POST(req: NextRequest) {
  return tenantPOST(req, { params: { slug: 'lung-pa' } });
}
