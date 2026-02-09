import NodeCache from "node-cache";

class CacheService {
  private cache: NodeCache;

  constructor(ttlSeconds: number) {
    this.cache = new NodeCache({
      stdTTL: ttlSeconds,
      checkperiod: ttlSeconds * 0.2,
      useClones: false,
    });
  }

  get<T>(key: string): T | undefined {
    return this.cache.get<T>(key);
  }

  set<T>(key: string, value: T, ttl?: number): boolean {
    if (ttl) {
      return this.cache.set(key, value, ttl);
    }
    return this.cache.set(key, value);
  }

  del(key: string | string[]): number {
    return this.cache.del(key);
  }

  flush(): void {
    this.cache.flushAll();
  }
}

// Export a default instance for general use (e.g., 5 minutes TTL)
export const apiCache = new CacheService(300);

// Export the class if someone wants a custom instance
export default CacheService;
