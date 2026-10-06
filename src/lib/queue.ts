import { isDue, isNew } from './srs';
import type { KnownWord } from './types';

export interface ReviewQueue {
  /** Cards to study now: due reviews first, then new cards up to the daily limit. */
  cards: KnownWord[];
  reviews: number;
  newCards: number;
  /** New cards still allowed today. Infinity when unlimited. */
  newRemaining: number;
}

export function startOfDay(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function buildQueue(words: KnownWord[], now: number, dailyNewLimit: number): ReviewQueue {
  const active = words.filter((w) => !w.suspended);
  const today = startOfDay(now);
  const introducedToday = active.filter((w) => (w.srs.firstReview ?? 0) >= today).length;
  const newRemaining = dailyNewLimit > 0 ? Math.max(0, dailyNewLimit - introducedToday) : Infinity;

  const reviews = active.filter((w) => !isNew(w.srs) && isDue(w.srs, now)).sort((a, b) => a.srs.due - b.srs.due);
  const fresh = active
    .filter((w) => isNew(w.srs))
    .sort((a, b) => a.addedAt - b.addedAt)
    .slice(0, newRemaining === Infinity ? undefined : newRemaining);

  return { cards: [...reviews, ...fresh], reviews: reviews.length, newCards: fresh.length, newRemaining };
}
