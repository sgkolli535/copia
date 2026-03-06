export interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttlMs: number;
  source: string;
}

export interface CacheOptions {
  /** Time-to-live in milliseconds */
  ttlMs: number;
  /** Source identifier for staleness tracking */
  source: string;
}

const DEFAULT_TTL: Record<string, number> = {
  frankfurter: 60 * 60 * 1000,        // 1 hour
  oecd: 24 * 60 * 60 * 1000,          // 24 hours
  'ictd-tax-treaties': 7 * 24 * 60 * 60 * 1000, // 7 days
  hmrc: 7 * 24 * 60 * 60 * 1000,      // 7 days
  static: Infinity,                     // Never expires
};

const store = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): { data: T; isStale: boolean } | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  const age = Date.now() - entry.cachedAt;
  const isStale = age > entry.ttlMs;

  return { data: entry.data, isStale };
}

export function setCache<T>(key: string, data: T, options: CacheOptions): void {
  store.set(key, {
    data,
    cachedAt: Date.now(),
    ttlMs: options.ttlMs,
    source: options.source,
  });
}

export function invalidateCache(key: string): void {
  store.delete(key);
}

export function clearCache(): void {
  store.clear();
}

export function getDefaultTtl(source: string): number {
  return DEFAULT_TTL[source] ?? 24 * 60 * 60 * 1000;
}

export function getCacheStats(): { size: number; entries: Array<{ key: string; source: string; isStale: boolean }> } {
  const entries: Array<{ key: string; source: string; isStale: boolean }> = [];
  for (const [key, entry] of store.entries()) {
    const age = Date.now() - entry.cachedAt;
    entries.push({
      key,
      source: entry.source,
      isStale: age > entry.ttlMs,
    });
  }
  return { size: store.size, entries };
}
