import { eventBus, EventPayload } from '@/lib/events';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const store = await prisma.store.findUnique({
    where: { slug: params.slug },
    select: { id: true },
  });

  if (!store) {
    return new Response('Store not found', { status: 404 });
  }

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial connection event
  const sendEvent = (event: string, data: any) => {
    try {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      writer.write(encoder.encode(payload));
    } catch (e) {
      // client disconnected
    }
  };

  sendEvent('connected', { timestamp: Date.now(), storeId: store.id });

  // Listen to store-scoped events and global events
  const onPosEvent = (payload: EventPayload) => {
    if (!payload.storeId || payload.storeId === store.id) {
      sendEvent(payload.type, payload.data);
    }
  };

  eventBus.on('pos-event', onPosEvent);

  // Keep-alive heartbeat every 15s
  const interval = setInterval(() => {
    sendEvent('ping', { timestamp: Date.now() });
  }, 15000);

  request.signal.addEventListener('abort', () => {
    clearInterval(interval);
    eventBus.off('pos-event', onPosEvent);
    writer.close().catch(() => {});
  });

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
