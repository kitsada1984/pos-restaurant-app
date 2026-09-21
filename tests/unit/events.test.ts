import { describe, it, expect, vi } from 'vitest';
import {
  broadcastEvent,
  eventBus,
  LocalEventEmitterBroadcaster,
  CompositeBroadcaster,
  IRealtimeBroadcaster,
  EventPayload,
} from '@/lib/events';

describe('Realtime Events Module', () => {
  it('broadcasts event synchronously via eventBus', () => {
    const listener = vi.fn();
    eventBus.on('pos-event', listener);

    broadcastEvent('ORDER_CREATED', { id: 'ord-123', total: 100 }, 'store-abc');

    expect(listener).toHaveBeenCalledTimes(1);
    const payload: EventPayload = listener.mock.calls[0][0];
    expect(payload.type).toBe('ORDER_CREATED');
    expect(payload.data).toEqual({ id: 'ord-123', total: 100 });
    expect(payload.storeId).toBe('store-abc');
    expect(typeof payload.timestamp).toBe('number');

    eventBus.off('pos-event', listener);
  });

  it('broadcasts store-scoped event to store-specific channel', () => {
    const storeListener = vi.fn();
    eventBus.on('pos-event-store-xyz', storeListener);

    broadcastEvent('TABLE_UPDATED', { tableNo: 5, status: 'OCCUPIED' }, 'store-xyz');

    expect(storeListener).toHaveBeenCalledTimes(1);
    const payload: EventPayload = storeListener.mock.calls[0][0];
    expect(payload.type).toBe('TABLE_UPDATED');
    expect(payload.data.tableNo).toBe(5);

    eventBus.off('pos-event-store-xyz', storeListener);
  });

  it('CompositeBroadcaster dispatches to all registered broadcasters', async () => {
    const mockSink1: IRealtimeBroadcaster = {
      broadcast: vi.fn(),
    };
    const mockSink2: IRealtimeBroadcaster = {
      broadcast: vi.fn(),
    };

    const composite = new CompositeBroadcaster([mockSink1]);
    composite.addBroadcaster(mockSink2);

    const testPayload: EventPayload = {
      type: 'PAYMENT_RECEIVED',
      data: { amount: 250 },
      storeId: 'store-1',
      timestamp: Date.now(),
    };

    await composite.broadcast(testPayload);

    expect(mockSink1.broadcast).toHaveBeenCalledWith(testPayload);
    expect(mockSink2.broadcast).toHaveBeenCalledWith(testPayload);
  });
});
