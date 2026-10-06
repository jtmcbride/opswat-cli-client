import type { Grade, SrsState } from './types';

/**
 * FSRS-5 scheduler (Free Spaced Repetition Scheduler, as used by Anki). Each card tracks
 * stability (days until recall probability drops to 90%) and difficulty (1–10). Reviews are
 * scheduled for when predicted recall falls to the learner's desired retention.
 * https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
 */

const DAY = 24 * 60 * 60 * 1000;
/** Cards answered "again" come back after this delay within the same session. */
const RELEARN_DELAY = 60 * 1000;
const MAX_INTERVAL_DAYS = 36500;

// FSRS-5 default parameters.
const W = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605,
  2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
];
const DECAY = -0.5;
const FACTOR = 19 / 81; // so that R(t = S) = 0.9

const GRADE_VALUE: Record<Grade, number> = { again: 1, hard: 2, good: 3, easy: 4 };

export interface ScheduleOptions {
  /** Target probability of recall at review time, 0.7–0.97. */
  retention?: number;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Probability of recalling a card `elapsedDays` after its last review. */
export function retrievability(elapsedDays: number, stability: number): number {
  return Math.pow(1 + (FACTOR * elapsedDays) / stability, DECAY);
}

/** Days until recall probability falls to `retention`. */
export function intervalDays(stability: number, retention = 0.9): number {
  const days = (stability / FACTOR) * (Math.pow(retention, 1 / DECAY) - 1);
  return clamp(Math.round(days), 1, MAX_INTERVAL_DAYS);
}

const initStability = (g: number) => W[g - 1];
const initDifficulty = (g: number) => clamp(W[4] - Math.exp(W[5] * (g - 1)) + 1, 1, 10);

function nextDifficulty(d: number, g: number): number {
  const delta = -W[6] * (g - 3);
  const damped = d + (delta * (10 - d)) / 9;
  // Mean reversion toward the difficulty of an "easy" first answer.
  return clamp(W[7] * initDifficulty(4) + (1 - W[7]) * damped, 1, 10);
}

function recallStability(d: number, s: number, r: number, g: number): number {
  const hardPenalty = g === 2 ? W[15] : 1;
  const easyBonus = g === 4 ? W[16] : 1;
  return s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * hardPenalty * easyBonus);
}

function lapseStability(d: number, s: number, r: number): number {
  const next = W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r));
  return Math.min(next, s);
}

/** Reviews on the same day (learning steps, retries) use FSRS-5's short-term formula. */
const shortTermStability = (s: number, g: number) => s * Math.exp(W[17] * (g - 3 + W[18]));

export function newSrs(now = Date.now()): SrsState {
  return { state: 'new', stability: 0, difficulty: 0, reps: 0, lapses: 0, due: now };
}

/**
 * State for a word the learner already knows (e.g. from a placement test): treated as reviewed
 * today with a month of stability, first check-in after `dueInDays`.
 */
export function knownSrs(now: number, dueInDays: number): SrsState {
  return { state: 'review', stability: 30, difficulty: 4, reps: 1, lapses: 0, lastReview: now, due: now + dueInDays * DAY };
}

/** Pure: the next state for a card given a grade. */
export function schedule(state: SrsState, grade: Grade, now = Date.now(), opts: ScheduleOptions = {}): SrsState {
  const retention = opts.retention ?? 0.9;
  const g = GRADE_VALUE[grade];
  const base = { reps: state.reps + 1, lastReview: now, firstReview: state.firstReview ?? now };

  if (state.state === 'new' || !state.stability) {
    const stability = initStability(g);
    const difficulty = initDifficulty(g);
    if (g === 1) return { ...state, ...base, state: 'learning', stability, difficulty, due: now + RELEARN_DELAY };
    return { ...state, ...base, state: 'review', stability, difficulty, due: now + intervalDays(stability, retention) * DAY };
  }

  const elapsed = Math.max(0, (now - (state.lastReview ?? now)) / DAY);
  const sameDay = elapsed < 1;
  const r = retrievability(elapsed, state.stability);
  const difficulty = nextDifficulty(state.difficulty, g);

  if (g === 1) {
    const stability = sameDay ? shortTermStability(state.stability, g) : lapseStability(state.difficulty, state.stability, r);
    return {
      ...state,
      ...base,
      state: state.state === 'review' ? 'relearning' : state.state,
      stability: Math.max(stability, 0.1),
      difficulty,
      lapses: state.lapses + (state.state === 'review' ? 1 : 0),
      due: now + RELEARN_DELAY,
    };
  }

  // Compute every passing grade so intervals stay ordered: hard <= good < easy.
  const stabilityFor = (gg: number) =>
    sameDay ? shortTermStability(state.stability, gg) : recallStability(state.difficulty, state.stability, r, gg);
  const hard = intervalDays(stabilityFor(2), retention);
  const good = Math.max(intervalDays(stabilityFor(3), retention), hard);
  const easy = Math.max(intervalDays(stabilityFor(4), retention), good + 1);
  const days = g === 2 ? Math.min(hard, good) : g === 3 ? good : easy;
  return { ...state, ...base, state: 'review', stability: stabilityFor(g), difficulty, due: now + days * DAY };
}

export function isDue(state: SrsState, now = Date.now()): boolean {
  return state.due <= now;
}

/** True when the card is new (never reviewed). */
export const isNew = (state: SrsState) => state.state === 'new';

/** Human-readable preview of the interval a grade would produce, e.g. "1m", "6d". */
export function previewInterval(state: SrsState, grade: Grade, now = Date.now(), opts: ScheduleOptions = {}): string {
  const ms = schedule(state, grade, now, opts).due - now;
  if (ms < DAY) return `${Math.max(1, Math.round(ms / 60000))}m`;
  const days = Math.round(ms / DAY);
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

/** Old SM-2 state (app v1) as persisted on devices and in backups. */
interface LegacySrs {
  ease: number;
  interval: number;
  reps: number;
  lapses: number;
  due: number;
}

/** Converts SM-2 state to FSRS: interval ≈ stability at 90% retention; ease maps onto difficulty. */
export function migrateSrs(s: SrsState | LegacySrs): SrsState {
  if ('state' in s) return s;
  if (s.reps === 0 && s.interval === 0) {
    return s.lapses > 0
      ? { state: 'relearning', stability: 1, difficulty: 7, reps: 1, lapses: s.lapses, due: s.due, lastReview: s.due - RELEARN_DELAY }
      : { state: 'new', stability: 0, difficulty: 0, reps: 0, lapses: 0, due: s.due };
  }
  const stability = Math.max(s.interval, 0.5);
  return {
    state: 'review',
    stability,
    difficulty: clamp(5.28 + (2.5 - s.ease) * 3, 1, 10),
    reps: s.reps,
    lapses: s.lapses,
    due: s.due,
    lastReview: s.due - s.interval * DAY,
  };
}

/** Words failed this many times are "leeches": better rewritten or suspended than drilled. */
export const LEECH_LAPSES = 6;
export const isLeech = (state: SrsState) => state.lapses >= LEECH_LAPSES;
