import type { Request, Response, NextFunction } from "express";

let RatelimitClass: any = null;
let RedisClass: any = null;
let loadedOnce = false;

async function ensureLoaded() {
  if (loadedOnce) return;
  loadedOnce = true;
  try {
    const rl = await import("@upstash/ratelimit");
    const rd = await import("@upstash/redis");
    RatelimitClass = rl.Ratelimit;
    RedisClass = rd.Redis;
  } catch {}
}
void ensureLoaded();

function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  if (!RedisClass) return null;
  try {
    return new RedisClass({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } catch { return null; }
}

function buildLimiter(limit: number, windowMs: number, prefix: string) {
  const isProd = process.env.NODE_ENV === 'production';

  return async (req: Request, res: Response, next: NextFunction) => {
    await ensureLoaded();
    const redis = getRedis();

    if (!redis || !RatelimitClass) {
      if (isProd) {
        console.error('[RateLimit] Upstash not configured — refusing request in production');
        return res.status(503).json({
          error: 'სერვისი დროებით მიუწვდომელია. გთხოვთ სცადოთ მოგვიანებით.',
        });
      }
      return next();
    }

    const rl = new RatelimitClass({
      redis,
      limiter: RatelimitClass.slidingWindow(limit, `${windowMs} ms`),
      analytics: false,
      prefix: `kalegroup:${prefix}`,
    });

    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown';
    try {
      const { success, remaining, reset } = await rl.limit(ip);
      res.setHeader('X-RateLimit-Remaining', String(remaining));
      res.setHeader('X-RateLimit-Reset', String(reset));
      if (!success) {
        return res.status(429).json({ error: 'ძალიან ბევრი მოთხოვნა. გთხოვთ მოგვიანებით სცადოთ.' });
      }
    } catch (err) {
      console.warn('[RateLimit] Upstash error — allowing request through:', err);
    }
    next();
  };
}

export const generalLimiter     = buildLimiter(200, 15 * 60 * 1000, 'general');
export const aiLimiter          = buildLimiter(20,  15 * 60 * 1000, 'ai');
export const aiImageLimiter     = buildLimiter(5,   15 * 60 * 1000, 'ai-image');
export const orderCreateLimiter = buildLimiter(10,  15 * 60 * 1000, 'order-create');
