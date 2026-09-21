import { NextRequest } from 'next/server';
import { GET as tenantGET } from '../../r/[slug]/reports/daily/route';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return tenantGET(req, { params: { slug: 'lung-pa' } });
}
