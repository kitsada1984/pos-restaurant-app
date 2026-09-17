// Singleton Real-time SSE Manager
// Shares a single EventSource connection across all mounted components in the same tab (e.g. POS + Kitchen split screen)

type EventCallback = (payload: any) => void;

interface StreamConnection {
  eventSource: EventSource | null;
  subscribers: Set<EventCallback>;
  reconnectTimeout: any;
  isConnecting: boolean;
}

const connections = new Map<string, StreamConnection>();

export function subscribeRealtime(slug: string, callback: EventCallback): () => void {
  if (typeof window === 'undefined' || !('EventSource' in window)) {
    return () => {};
  }

  let conn = connections.get(slug);
  if (!conn) {
    conn = {
      eventSource: null,
      subscribers: new Set(),
      reconnectTimeout: null,
      isConnecting: false,
    };
    connections.set(slug, conn);
  }

  conn.subscribers.add(callback);

  const connect = () => {
    if (!conn || conn.subscribers.size === 0) return;
    if (conn.eventSource && conn.eventSource.readyState !== EventSource.CLOSED) return;

    try {
      conn.isConnecting = true;
      const es = new EventSource(`/api/r/${slug}/stream`);
      conn.eventSource = es;

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          conn?.subscribers.forEach((cb) => {
            try {
              cb(payload);
            } catch (err) {
              console.error('Error in realtime subscriber callback:', err);
            }
          });
        } catch (e) {}
      };

      es.onerror = () => {
        es.close();
        if (conn && conn.subscribers.size > 0) {
          clearTimeout(conn.reconnectTimeout);
          conn.reconnectTimeout = setTimeout(connect, 3500);
        }
      };

      es.onopen = () => {
        if (conn) conn.isConnecting = false;
      };
    } catch (e) {
      if (conn && conn.subscribers.size > 0) {
        clearTimeout(conn.reconnectTimeout);
        conn.reconnectTimeout = setTimeout(connect, 3500);
      }
    }
  };

  if (!conn.eventSource || conn.eventSource.readyState === EventSource.CLOSED) {
    connect();
  }

  // Return unsubscribe cleanup function
  return () => {
    const currentConn = connections.get(slug);
    if (!currentConn) return;

    currentConn.subscribers.delete(callback);

    if (currentConn.subscribers.size === 0) {
      clearTimeout(currentConn.reconnectTimeout);
      if (currentConn.eventSource) {
        currentConn.eventSource.close();
        currentConn.eventSource = null;
      }
      connections.delete(slug);
    }
  };
}
