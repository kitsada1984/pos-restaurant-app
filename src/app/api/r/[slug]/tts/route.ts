import { NextRequest } from 'next/server';
import { GET as handleTts } from '@/app/api/tts/route';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return handleTts(request);
}
