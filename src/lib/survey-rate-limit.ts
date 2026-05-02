/** Very small in-memory limiter for anonymous survey submissions (PRD ~5/min per IP). */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

export function allowSurveySubmit(ip: string): boolean {
  const now = Date.now();
  let b = buckets.get(ip);
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(ip, b);
  }
  b.count += 1;
  return b.count <= MAX_PER_WINDOW;
}
