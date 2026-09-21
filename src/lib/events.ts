import { EventEmitter } from 'events';

// Global singleton EventEmitter across hot reloads in development
const globalForEvents = globalThis as unknown as {
  posEventBus: EventEmitter | undefined;
};

export const eventBus = globalForEvents.posEventBus ?? new EventEmitter();
eventBus.setMaxListeners(200);

if (process.env.NODE_ENV !== 'production') {
  globalForEvents.posEventBus = eventBus;
}

export type EventPayload = {
  type: 'ORDER_CREATED' | 'ORDER_UPDATED' | 'TABLE_UPDATED' | 'PAYMENT_RECEIVED' | 'MENU_UPDATED' | 'SLIP_SUBMITTED' | 'BANK_NOTIFY_RECEIVED' | 'CUSTOMER_PAYMENT_NOTIFIED' | 'SERVICE_CALLED';
  data: any;
  storeId?: string;
  timestamp: number;
};

export interface IRealtimeBroadcaster {
  broadcast(payload: EventPayload): Promise<void> | void;
}

export class LocalEventEmitterBroadcaster implements IRealtimeBroadcaster {
  broadcast(payload: EventPayload): void {
    eventBus.emit('pos-event', payload);
    if (payload.storeId) {
      eventBus.emit(`pos-event-${payload.storeId}`, payload);
    }
  }
}

/**
 * Composite Broadcaster allowing multiple adapters (Local EventEmitter, Supabase Realtime, etc.)
 */
export class CompositeBroadcaster implements IRealtimeBroadcaster {
  private broadcasters: IRealtimeBroadcaster[];

  constructor(broadcasters: IRealtimeBroadcaster[] = [new LocalEventEmitterBroadcaster()]) {
    this.broadcasters = [...broadcasters];
  }

  addBroadcaster(broadcaster: IRealtimeBroadcaster): void {
    this.broadcasters.push(broadcaster);
  }

  getBroadcasters(): IRealtimeBroadcaster[] {
    return [...this.broadcasters];
  }

  async broadcast(payload: EventPayload): Promise<void> {
    const results = await Promise.allSettled(
      this.broadcasters.map((b) => Promise.resolve(b.broadcast(payload)))
    );
    for (const res of results) {
      if (res.status === 'rejected') {
        console.error('Realtime broadcaster failed:', res.reason);
      }
    }
  }
}

export const defaultBroadcaster = new CompositeBroadcaster([new LocalEventEmitterBroadcaster()]);

export function broadcastEvent(type: EventPayload['type'], data: any, storeId?: string) {
  const payload: EventPayload = {
    type,
    data,
    storeId,
    timestamp: Date.now(),
  };

  // Dispatch through broadcaster system (LocalEventEmitterBroadcaster + any registered external sinks)
  defaultBroadcaster.broadcast(payload).catch((err) => {
    console.error('Error broadcasting event:', err);
  });
}


