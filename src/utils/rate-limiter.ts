/**
 * Rate Limiter Implementation - CulturalTruth MCP
 * Simple token bucket rate limiter
 */

export class SimpleRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private tokensPerInterval: number;
  private interval: number;

  constructor(options: { tokensPerInterval: number; interval: string }) {
    this.tokensPerInterval = options.tokensPerInterval;
    this.interval = options.interval === "minute" ? 60000 : 1000;
    this.tokens = this.tokensPerInterval;
    this.lastRefill = Date.now();
  }

  async removeTokens(count: number): Promise<void> {
    const now = Date.now();
    const timePassed = now - this.lastRefill;

    if (timePassed >= this.interval) {
      this.tokens = this.tokensPerInterval;
      this.lastRefill = now;
    }

    if (this.tokens >= count) {
      this.tokens -= count;
      return Promise.resolve();
    }
    const waitTime = this.interval - timePassed;
    return new Promise((resolve) => setTimeout(resolve, waitTime));
  }
}
