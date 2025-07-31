/**
 * LRU Cache Implementation - CulturalTruth MCP
 * Least Recently Used cache with Time-To-Live support
 */

export class LRUCache<T> {
  private cache = new Map<
    string,
    { value: T; timestamp: number; accessCount: number }
  >();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize = 1000, ttlMs = 300000) {
    // 5 min default TTL
    this.maxSize = maxSize;
    this.ttl = ttlMs;
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check TTL
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access count and move to end (LRU behavior)
    item.accessCount++;
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key: string, value: T): void {
    // Remove oldest items if at capacity
    while (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      } else {
        break; // Safety check to prevent infinite loop
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      accessCount: 1,
    });
  }

  size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; hitRate: number } {
    const totalAccesses = Array.from(this.cache.values()).reduce(
      (sum, item) => sum + item.accessCount,
      0,
    );
    return {
      size: this.cache.size,
      hitRate: totalAccesses > 0 ? this.cache.size / totalAccesses : 0,
    };
  }
}
