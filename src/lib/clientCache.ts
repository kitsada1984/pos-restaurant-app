// In-Memory SWR Client Cache for Semi-Static Data (Menu, Settings, Promotions)
type CacheEntry<T> = {
  data: T;
  timestamp: number;
  ttl: number;
};

const memoryCache = new Map<string, CacheEntry<any>>();

export function getCachedData<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > entry.ttl) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCachedData<T>(key: string, data: T, ttlMs: number = 60000): void {
  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  });
}

export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = 60000
): Promise<T> {
  const cached = getCachedData<T>(key);
  if (cached !== null) {
    return cached;
  }

  const freshData = await fetcher();
  if (freshData !== null && freshData !== undefined) {
    setCachedData(key, freshData, ttlMs);
  }
  return freshData;
}

export function invalidateCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    memoryCache.clear();
    return;
  }
  memoryCache.forEach((_, key) => {
    if (key.startsWith(keyPrefix)) {
      memoryCache.delete(key);
    }
  });
}
