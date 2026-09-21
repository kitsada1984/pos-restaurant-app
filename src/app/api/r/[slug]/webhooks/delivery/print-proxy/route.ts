import { NextResponse } from 'next/server';
import { processDeliveryWebhook } from '@/lib/deliveryEngine';
import { normalizePrintProxyPayload } from '@/lib/receiptParser';

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    let rawPayload: any;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      rawPayload = await request.json();
    } else {
      const text = await request.text();
      try {
        rawPayload = JSON.parse(text);
      } catch {
        rawPayload = { rawText: text };
      }
    }

    // Parse and normalize raw receipt text or structured JSON from Virtual Print Proxy
    const normalized = normalizePrintProxyPayload(rawPayload);

    const result = await processDeliveryWebhook(params.slug, normalized, request.headers);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err: any) {
    console.error('Virtual Print Proxy webhook route error:', err);
    return NextResponse.json({ error: 'Invalid print proxy request', details: err?.message }, { status: 400 });
  }
}
