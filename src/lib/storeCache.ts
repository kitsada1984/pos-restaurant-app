// In-Memory Store Slug -> Store ID Cache for API Routes
// Avoids hammering prisma.store.findUnique on every API endpoint request

import { prisma } from '@/lib/prisma';

interface CachedStore {
  id: string;
  slug: string;
  name?: string;
  timestamp: number;
}

const storeMemoryMap = new Map<string, CachedStore>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getStoreBySlug(slug: string) {
  const cached = storeMemoryMap.get(slug);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { id: cached.id, slug: cached.slug, name: cached.name };
  }

  const store = await prisma.store.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true },
  });

  if (store) {
    storeMemoryMap.set(slug, {
      id: store.id,
      slug: store.slug,
      name: store.name,
      timestamp: Date.now(),
    });
  }

  return store;
}

export function invalidateStoreCache(slug: string) {
  storeMemoryMap.delete(slug);
}
