// Rate limiting in-memory për MVP.
// UPGRADE: në prod me shumë instanca, zëvendëso me Upstash Redis (@upstash/ratelimit).

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Kthen true nëse kërkesa lejohet (dhe e numëron), false nëse limiti është kapërcyer.
 * key: identifikues unik (p.sh. `otp:${phoneHash}`), limit: nr max, windowMs: dritarja kohore.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count++;
  return true;
}

// Pastrim periodik që Map-i të mos rritet pafund
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, 60_000).unref?.();
