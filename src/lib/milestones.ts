/** Long-term goals that mark progress: deck size, mastery, consistency, effort and reach. */

export interface MilestoneInput {
  words: number;
  mastered: number;
  bestStreak: number;
  reviews: number;
  /** Everyday coverage (0–1), when the language has built-in sentences. */
  coverage: number | null;
}

type TrackId = 'words' | 'mastered' | 'streak' | 'reviews' | 'coverage';

interface Track {
  id: TrackId;
  name: string;
  targets: number[];
  value: (i: MilestoneInput) => number | null;
  title: (n: number) => string;
  /** How the current value reads next to the target. */
  format?: (n: number) => string;
}

const pct = (x: number) => `${Math.floor(x * 100)}%`;

const TRACKS: Track[] = [
  {
    id: 'words',
    name: 'Words in your deck',
    targets: [10, 50, 100, 250, 500, 1000, 2000, 3000, 5000],
    value: (i) => i.words,
    title: (n) => `${n.toLocaleString()} words`,
  },
  {
    id: 'mastered',
    name: 'Words mastered',
    targets: [10, 50, 100, 250, 500, 1000, 2000],
    value: (i) => i.mastered,
    title: (n) => `${n.toLocaleString()} words mastered`,
  },
  {
    id: 'streak',
    name: 'Best streak',
    targets: [3, 7, 14, 30, 60, 100, 200, 365],
    value: (i) => i.bestStreak,
    title: (n) => `${n}-day streak`,
  },
  {
    id: 'reviews',
    name: 'Reviews',
    targets: [100, 500, 1000, 2500, 5000, 10000, 25000],
    value: (i) => i.reviews,
    title: (n) => `${n.toLocaleString()} reviews`,
  },
  {
    id: 'coverage',
    name: 'Everyday coverage',
    targets: [0.25, 0.5, 0.6, 0.7, 0.8, 0.9],
    value: (i) => i.coverage,
    title: (n) => `${pct(n)} everyday coverage`,
    format: pct,
  },
];

export interface Milestone {
  /** Stable id, e.g. "words:100". */
  id: string;
  title: string;
}

export interface TrackProgress {
  id: TrackId;
  name: string;
  /** Highest milestone reached on this track. */
  reached: Milestone | null;
  /** The next one, with progress toward it; null once the track is complete. */
  next: { milestone: Milestone; value: string; target: string; share: number } | null;
}

const milestone = (t: Track, n: number): Milestone => ({ id: `${t.id}:${n}`, title: t.title(n) });

export function milestones(input: MilestoneInput): { achieved: Milestone[]; tracks: TrackProgress[] } {
  const achieved: Milestone[] = [];
  const tracks: TrackProgress[] = [];
  for (const t of TRACKS) {
    const v = t.value(input);
    if (v === null) continue;
    const done = t.targets.filter((n) => v >= n);
    achieved.push(...done.map((n) => milestone(t, n)));
    const nextTarget = t.targets.find((n) => v < n);
    const fmt = t.format ?? ((n: number) => n.toLocaleString());
    tracks.push({
      id: t.id,
      name: t.name,
      reached: done.length ? milestone(t, done[done.length - 1]) : null,
      next:
        nextTarget === undefined
          ? null
          : { milestone: milestone(t, nextTarget), value: fmt(v), target: fmt(nextTarget), share: v / nextTarget },
    });
  }
  return { achieved, tracks };
}

/** Milestones reached but not yet celebrated, biggest per track only (no flood after a bulk import). */
export function toCelebrate(achieved: Milestone[], celebrated: string[]): Milestone[] {
  const seen = new Set(celebrated);
  const latest = new Map<string, Milestone>();
  for (const m of achieved) if (!seen.has(m.id)) latest.set(m.id.split(':')[0], m);
  return [...latest.values()];
}
