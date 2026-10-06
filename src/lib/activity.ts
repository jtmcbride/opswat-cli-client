import type { LangCode } from './types';

/** Per-day tallies, keyed by local date "YYYY-MM-DD". */
export interface DayActivity {
  reviews: number;
  /** Reviews answered "again" (forgotten), for retention. */
  again: number;
  /** Words added. */
  added: number;
}
export type ActivityLog = Record<LangCode, Record<string, DayActivity>>;

const pad = (n: number) => String(n).padStart(2, '0');

export function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The key `n` days before `t` (negative n = after). Uses calendar days, so DST-safe. */
export function dayKeyOffset(t: number, n: number): string {
  const d = new Date(t);
  d.setDate(d.getDate() - n);
  return dayKey(d.getTime());
}

export function record(log: ActivityLog, lang: LangCode, t: number, delta: Partial<DayActivity>): ActivityLog {
  const key = dayKey(t);
  const days = log[lang] ?? {};
  const cur = days[key] ?? { reviews: 0, again: 0, added: 0 };
  return {
    ...log,
    [lang]: {
      ...days,
      [key]: {
        reviews: cur.reviews + (delta.reviews ?? 0),
        again: cur.again + (delta.again ?? 0),
        added: cur.added + (delta.added ?? 0),
      },
    },
  };
}

/**
 * Consecutive days with at least one review, ending today. If nothing is done yet today the streak
 * still counts through yesterday, so it isn't shown as broken before the day is over.
 */
export function streak(days: Record<string, DayActivity> | undefined, now: number): number {
  if (!days) return 0;
  const active = (n: number) => (days[dayKeyOffset(now, n)]?.reviews ?? 0) > 0;
  let n = active(0) ? 0 : 1;
  let count = 0;
  while (active(n)) {
    count++;
    n++;
  }
  return count;
}

/** Series of `count` days ending today, oldest first. */
export function lastDays(days: Record<string, DayActivity> | undefined, now: number, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const key = dayKeyOffset(now, count - 1 - i);
    return { key, ...(days?.[key] ?? { reviews: 0, again: 0, added: 0 }) };
  });
}

/** Share of reviews remembered (not "again") over the last `count` days; null with no reviews. */
export function retentionRate(days: Record<string, DayActivity> | undefined, now: number, count = 30): number | null {
  const series = lastDays(days, now, count);
  const reviews = series.reduce((s, d) => s + d.reviews, 0);
  const again = series.reduce((s, d) => s + d.again, 0);
  return reviews ? 1 - again / reviews : null;
}

/** Due-review counts for each of the next `count` days (day 0 = today, including overdue). */
export function forecast(dues: number[], now: number, count = 14): { key: string; due: number }[] {
  const keys = Array.from({ length: count }, (_, i) => dayKeyOffset(now, -i));
  const counts = new Map(keys.map((k) => [k, 0]));
  for (const due of dues) {
    const k = due <= now ? keys[0] : dayKey(due);
    if (counts.has(k)) counts.set(k, counts.get(k)! + 1);
  }
  return keys.map((key) => ({ key, due: counts.get(key)! }));
}

/** Longest run of consecutive days with reviews. */
export function bestStreak(days: Record<string, DayActivity> | undefined): number {
  if (!days) return 0;
  const active = Object.keys(days)
    .filter((k) => days[k].reviews > 0)
    .sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of active) {
    const [y, m, d] = key.split('-').map(Number);
    run = prev !== null && dayKeyOffset(new Date(y, m - 1, d).getTime(), 1) === prev ? run + 1 : 1;
    best = Math.max(best, run);
    prev = key;
  }
  return best;
}

export interface CalendarDay {
  key: string;
  reviews: number;
  /** 0 = no reviews, 1–3 = increasing share of the goal, 4 = goal met. */
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
}

/** `weeks` columns of Monday→Sunday days ending with the current week, for an activity calendar. */
export function calendar(days: Record<string, DayActivity> | undefined, now: number, weeks: number, goal: number): CalendarDay[][] {
  const today = new Date(now);
  const sinceMonday = (today.getDay() + 6) % 7;
  const start = -(weeks - 1) * 7 - sinceMonday; // offset (in days, negative = past) of the first Monday
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const offset = start + w * 7 + d;
      const key = dayKeyOffset(now, -offset);
      const reviews = days?.[key]?.reviews ?? 0;
      const share = reviews / Math.max(1, goal);
      const level = reviews === 0 ? 0 : share >= 1 ? 4 : share >= 0.5 ? 3 : share >= 0.25 ? 2 : 1;
      return { key, reviews, level, future: offset > 0 };
    }),
  );
}

/** Days in the last `count` (including today) on which the review goal was met. */
export function goalDays(days: Record<string, DayActivity> | undefined, now: number, goal: number, count = 30): number {
  return lastDays(days, now, count).filter((d) => d.reviews >= Math.max(1, goal)).length;
}
