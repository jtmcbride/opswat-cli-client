import { intervalDays, isDue, isLeech, migrateSrs, newSrs, previewInterval, retrievability, schedule } from '@/lib/srs';
import type { Grade, SrsState } from '@/lib/types';

const DAY = 86400000;
const now = 1_700_000_000_000;
const days = (s: SrsState, at = now) => Math.round((s.due - at) / DAY);

/** Reviews a card on its due date with the given grades. */
function run(grades: Grade[], retention = 0.9) {
  let s = newSrs(now);
  let t = now;
  for (const g of grades) {
    s = schedule(s, g, t, { retention });
    t = Math.max(s.due, t);
  }
  return s;
}

describe('FSRS core', () => {
  it('retrievability is 90% after one stability period', () => {
    expect(retrievability(10, 10)).toBeCloseTo(0.9, 5);
    expect(intervalDays(10, 0.9)).toBe(10);
  });

  it('first answers set initial intervals: again < hard < good < easy', () => {
    const s = newSrs(now);
    expect(schedule(s, 'again', now).due - now).toBe(60000);
    expect(days(schedule(s, 'hard', now))).toBe(1);
    expect(days(schedule(s, 'good', now))).toBe(3);
    expect(days(schedule(s, 'easy', now))).toBe(16);
    expect(schedule(s, 'good', now)).toMatchObject({ state: 'review', reps: 1, firstReview: now });
  });

  it('intervals grow with successful reviews and stay ordered', () => {
    const s = run(['good', 'good', 'good']);
    expect(days(s, s.lastReview)).toBeGreaterThan(20);
    const t = s.due;
    const [h, g, e] = (['hard', 'good', 'easy'] as Grade[]).map((x) => days(schedule(s, x, t), t));
    expect(h).toBeLessThanOrEqual(g);
    expect(g).toBeLessThan(e);
  });

  it('a lapse shortens stability, counts a lapse, and relearns soon', () => {
    const learned = run(['good', 'good', 'good']);
    const lapsed = schedule(learned, 'again', learned.due);
    expect(lapsed).toMatchObject({ state: 'relearning', lapses: 1 });
    expect(lapsed.stability).toBeLessThan(learned.stability);
    expect(lapsed.due - learned.due).toBe(60000);
    // Relearned the same day: back to review with a short interval.
    const relearned = schedule(lapsed, 'good', lapsed.due);
    expect(relearned.state).toBe('review');
    expect(days(relearned, lapsed.due)).toBeLessThan(days(learned, learned.lastReview));
  });

  it('lower desired retention gives longer intervals', () => {
    expect(days(run(['good', 'good'], 0.8))).toBeGreaterThan(days(run(['good', 'good'], 0.95)));
  });

  it('difficulty rises on hard answers and stays within 1..10', () => {
    const easy = run(['easy', 'easy', 'easy']);
    const hard = run(['hard', 'hard', 'hard']);
    expect(hard.difficulty).toBeGreaterThan(easy.difficulty);
    for (const s of [easy, hard]) {
      expect(s.difficulty).toBeGreaterThanOrEqual(1);
      expect(s.difficulty).toBeLessThanOrEqual(10);
    }
  });

  it('reports due state, previews and leeches', () => {
    const s = newSrs(now);
    expect(isDue(s, now)).toBe(true);
    expect(isDue(schedule(s, 'good', now), now)).toBe(false);
    expect(previewInterval(s, 'again', now)).toBe('1m');
    expect(previewInterval(s, 'good', now)).toBe('3d');
    expect(isLeech({ ...s, lapses: 6 })).toBe(true);
  });
});

describe('migrateSrs', () => {
  it('converts SM-2 state', () => {
    expect(migrateSrs({ ease: 2.5, interval: 0, reps: 0, lapses: 0, due: now } as never)).toMatchObject({ state: 'new' });
    const m = migrateSrs({ ease: 2.5, interval: 10, reps: 3, lapses: 1, due: now } as never);
    expect(m).toMatchObject({ state: 'review', stability: 10, reps: 3, lapses: 1, due: now, lastReview: now - 10 * DAY });
    expect(m.difficulty).toBeCloseTo(5.28);
    expect(migrateSrs({ ease: 2.3, interval: 0, reps: 0, lapses: 2, due: now } as never).state).toBe('relearning');
  });

  it('leaves FSRS state alone', () => {
    const s = schedule(newSrs(now), 'good', now);
    expect(migrateSrs(s)).toBe(s);
  });
});
