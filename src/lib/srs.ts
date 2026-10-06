import type { Grade, SrsState } from './types';

const DAY = 24 * 60 * 60 * 1000;
const MIN_EASE = 1.3;
/** Cards answered "again" come back after this delay within the same session. */
const RELEARN_DELAY = 60 * 1000;

export function newSrs(now = Date.now()): SrsState {
  return { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: now };
}

/** SM-2 variant. Pure: returns the next state for a card given a grade. */
export function schedule(state: SrsState, grade: Grade, now = Date.now()): SrsState {
  let { ease, interval, reps, lapses } = state;

  if (grade === 'again') {
    return {
      ease: Math.max(MIN_EASE, ease - 0.2),
      interval: 0,
      reps: 0,
      lapses: lapses + (reps > 0 ? 1 : 0),
      due: now + RELEARN_DELAY,
    };
  }

  if (grade === 'hard') ease = Math.max(MIN_EASE, ease - 0.15);
  if (grade === 'easy') ease = ease + 0.15;

  if (reps === 0) {
    interval = grade === 'easy' ? 4 : 1;
  } else if (reps === 1) {
    interval = grade === 'hard' ? 3 : grade === 'easy' ? 8 : 6;
  } else {
    const factor = grade === 'hard' ? 1.2 : grade === 'easy' ? ease * 1.3 : ease;
    interval = Math.max(interval + 1, Math.round(interval * factor));
  }

  return { ease, interval, reps: reps + 1, lapses, due: now + interval * DAY };
}

export function isDue(state: SrsState, now = Date.now()): boolean {
  return state.due <= now;
}

/** Human-readable preview of the interval a grade would produce, e.g. "1m", "6d". */
export function previewInterval(state: SrsState, grade: Grade, now = Date.now()): string {
  const ms = schedule(state, grade, now).due - now;
  if (ms < DAY) return `${Math.max(1, Math.round(ms / 60000))}m`;
  const days = Math.round(ms / DAY);
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}
