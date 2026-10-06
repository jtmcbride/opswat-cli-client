import { dayKeyOffset, weekStats } from '@/lib/activity';
import { milestones, toCelebrate } from '@/lib/milestones';

// Wednesday, Oct 7 2026.
const now = new Date(2026, 9, 7, 15, 0).getTime();
const day = (n: number, reviews: number, added = 0) => ({ [dayKeyOffset(now, n)]: { reviews, again: Math.floor(reviews / 10), added } });

describe('weekStats', () => {
  it('totals Monday–Sunday weeks, this week through today', () => {
    // This week: Monday (2 days ago) to today. Last week: 9 to 3 days ago. The week before: 16 to 10.
    const days = { ...day(0, 20, 2), ...day(2, 5), ...day(3, 30, 4), ...day(9, 10), ...day(10, 1) };
    const cur = weekStats(days, now, 0, 20);
    expect(cur).toMatchObject({ start: dayKeyOffset(now, 2), reviews: 25, added: 2, activeDays: 2, goalDays: 1, length: 3 });
    const last = weekStats(days, now, 1, 20);
    expect(last).toMatchObject({ start: dayKeyOffset(now, 9), reviews: 40, added: 4, activeDays: 2, goalDays: 1, length: 7 });
    expect(weekStats(days, now, 2, 20)).toMatchObject({ start: dayKeyOffset(now, 16), reviews: 1, activeDays: 1 });
  });
});

describe('milestones', () => {
  const input = { words: 120, mastered: 12, bestStreak: 8, reviews: 90, coverage: 0.55 };

  it('reports reached milestones and the next target per track', () => {
    const { achieved, tracks } = milestones(input);
    expect(achieved.map((m) => m.id)).toEqual([
      'words:10',
      'words:50',
      'words:100',
      'mastered:10',
      'streak:3',
      'streak:7',
      'coverage:0.25',
      'coverage:0.5',
    ]);
    const words = tracks.find((t) => t.id === 'words')!;
    expect(words.reached?.title).toBe('100 words');
    expect(words.next).toMatchObject({ value: '120', target: '250', share: 120 / 250 });
    expect(tracks.find((t) => t.id === 'coverage')!.next).toMatchObject({ value: '55%', target: '60%' });
    expect(tracks.find((t) => t.id === 'reviews')!.reached).toBeNull();
  });

  it('leaves out coverage for languages without built-in sentences', () => {
    expect(milestones({ ...input, coverage: null }).tracks.map((t) => t.id)).not.toContain('coverage');
  });

  it('celebrates only the biggest new step per track', () => {
    const { achieved } = milestones(input);
    expect(toCelebrate(achieved, ['words:10', 'streak:3', 'streak:7', 'coverage:0.25', 'coverage:0.5']).map((m) => m.id)).toEqual([
      'words:100',
      'mastered:10',
    ]);
    expect(toCelebrate(achieved, achieved.map((m) => m.id))).toEqual([]);
  });
});
