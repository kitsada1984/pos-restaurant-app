import { NextResponse } from 'next/server';
import { processDeliveryWebhook } from '@/lib/deliveryEngine';

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const payload = await request.json();
    if (!payload.channel && !payload.platform) {
      payload.channel = 'GRAB';
    }
    const result = await processDeliveryWebhook(params.slug, payload, request.headers);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err: any) {
    console.error('GrabFood legacy webhook error:', err);
    return NextResponse.json({ error: 'Invalid JSON or webhook request' }, { status: 400 });
  }
}