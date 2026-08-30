import { EventEmitter } from 'events';

// Global singleton EventEmitter across hot reloads in development
const globalForEvents = globalThis as unknown as {
  posEventBus: EventEmitter | undefined;
};

export const eventBus = globalForEvents.posEventBus ?? new EventEmitter();
eventBus.setMaxListeners(100);

if (process.env.NODE_ENV !== 'production') {
  globalForEvents.posEventBus = eventBus;
}

export type EventPayload = {
  type: 'ORDER_CREATED' | 'ORDER_UPDATED' | 'TABLE_UPDATED' | 'PAYMENT_RECEIVED' | 'MENU_UPDATED';
  data: any;
  timestamp: number;
};

export function broadcastEvent(type: EventPayload['type'], data: any) {
  const payload: EventPayload = {
    type,
    data,
    timestamp: Date.now(),
  };
  eventBus.emit('pos-event', payload);
}
