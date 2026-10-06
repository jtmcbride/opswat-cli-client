import { isDue, newSrs, previewInterval, schedule } from '@/lib/srs';

const DAY = 86400000;
const now = 1_700_000_000_000;

describe('schedule', () => {
  it('graduates a new card to 1 day on good, 4 on easy', () => {
    expect(schedule(newSrs(now), 'good', now).due).toBe(now + DAY);
    expect(schedule(newSrs(now), 'easy', now).due).toBe(now + 4 * DAY);
  });

  it('grows intervals with ease on repeated good answers', () => {
    let s = newSrs(now);
    const intervals: number[] = [];
    for (let i = 0; i < 4; i++) {
      s = schedule(s, 'good', now);
      intervals.push(s.interval);
    }
    expect(intervals).toEqual([1, 6, 15, 38]);
  });

  it('resets on again and counts a lapse for learned cards', () => {
    let s = schedule(schedule(newSrs(now), 'good', now), 'good', now);
    s = schedule(s, 'again', now);
    expect(s.interval).toBe(0);
    expect(s.reps).toBe(0);
    expect(s.lapses).toBe(1);
    expect(s.ease).toBeCloseTo(2.3);
    expect(s.due - now).toBeLessThan(DAY);
  });

  it('never drops ease below 1.3', () => {
    let s = newSrs(now);
    for (let i = 0; i < 20; i++) s = schedule(s, 'again', now);
    expect(s.ease).toBe(1.3);
  });

  it('reports due state and previews', () => {
    const s = newSrs(now);
    expect(isDue(s, now)).toBe(true);
    expect(isDue(schedule(s, 'good', now), now)).toBe(false);
    expect(previewInterval(s, 'again', now)).toBe('1m');
    expect(previewInterval(s, 'good', now)).toBe('1d');
  });
});
