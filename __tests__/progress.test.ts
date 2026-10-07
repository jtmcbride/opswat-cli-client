import { bestStreak, calendar, dayKeyOffset, goalDays } from '@/lib/activity';
import { corpusCoverage } from '@/lib/coverage';
import { DictIndex } from '@/lib/dictionary';
import { planReminders } from '@/lib/reminders';
import { newSrs } from '@/lib/srs';
import { strengthCounts, strengthOf } from '@/lib/strength';
import type { KnownWord, SrsState } from '@/lib/types';

jest.mock('expo-notifications', () => ({}));

// Wednesday, Oct 7 2026, 15:00 local.
const now = new Date(2026, 9, 7, 15, 0).getTime();
const day = (n: number, reviews: number) => ({ [dayKeyOffset(now, n)]: { reviews, again: 0, added: 0 } });

describe('streak records', () => {
  it('finds the longest run of review days', () => {
    const days = { ...day(10, 5), ...day(9, 1), ...day(8, 3), ...day(5, 2), ...day(4, 2), ...day(0, 1) };
    expect(bestStreak(days)).toBe(3);
    expect(bestStreak(undefined)).toBe(0);
  });

  it('counts days the goal was met', () => {
    expect(goalDays({ ...day(0, 20), ...day(1, 19), ...day(2, 25), ...day(40, 50) }, now, 20)).toBe(2);
  });
});

describe('calendar', () => {
  it('lays out Monday-first weeks ending this week, shaded by share of the goal', () => {
    const weeks = calendar({ ...day(0, 20), ...day(1, 10), ...day(2, 1) }, now, 4, 20);
    expect(weeks).toHaveLength(4);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    const last = weeks[3];
    expect(last[0].key).toBe(dayKeyOffset(now, 2)); // Monday
    expect(last.map((d) => d.level)).toEqual([1, 3, 4, 0, 0, 0, 0]);
    expect(last.map((d) => d.future)).toEqual([false, false, false, true, true, true, true]);
    expect(weeks[0][0].key).toBe(dayKeyOffset(now, 23));
  });
});

describe('strength', () => {
  const srs = (state: SrsState['state'], stability: number): SrsState => ({ ...newSrs(0), state, stability, reps: 1 });
  it('tiers words by memory stability', () => {
    expect(strengthOf(newSrs(0))).toBe('new');
    expect(strengthOf(srs('relearning', 30))).toBe('learning');
    expect(strengthOf(srs('review', 3))).toBe('learning');
    expect(strengthOf(srs('review', 10))).toBe('familiar');
    expect(strengthOf(srs('review', 40))).toBe('mastered');
    const w = (s: SrsState, extra: Partial<KnownWord> = {}): KnownWord => ({ id: 'x', lang: 'es', word: 'a', gloss: '', addedAt: 0, srs: s, ...extra });
    const counts = strengthCounts([w(srs('review', 40), { produce: srs('review', 10) }), w(newSrs(0)), w(srs('review', 40), { suspended: true })]);
    expect(counts.recognize).toEqual({ new: 1, learning: 0, familiar: 0, mastered: 1 });
    expect(counts.produce).toEqual({ new: 1, learning: 0, familiar: 1, mastered: 0 });
  });
});

describe('corpusCoverage', () => {
  it('measures known share of running words and ranks what to learn next', () => {
    const index = new DictIndex([
      [
        { lemma: 'el', gloss: 'the', forms: ['la'] },
        { lemma: 'gato', gloss: 'cat' },
        { lemma: 'perro', gloss: 'dog' },
        { lemma: 'ser', gloss: 'to be', forms: ['es'] },
      ],
    ]);
    const sentences = [
      { text: 'El gato es Tom.', translation: '' },
      { text: 'El perro.', translation: '' },
      { text: 'La gata.', translation: '' },
    ];
    // Words outside the dictionary ("Tom", "gata") don't count.
    const c = corpusCoverage(sentences, index, new Set(['el', 'gato']))!;
    expect(c.ratio).toBeCloseTo(4 / 6);
    expect(c.next.map((n) => n.lemma).sort()).toEqual(['perro', 'ser']);
    expect(c.next[0].gain).toBeCloseTo(1 / 6);
  });
});

describe('planReminders', () => {
  const time = { hour: 19, minute: 0 };
  it('schedules a week of reminders, today mentioning the streak', () => {
    const plan = planReminders(now, time, { goalMet: false, streak: 12, reviewed: 5, goal: 20 });
    expect(plan).toHaveLength(7);
    expect(new Date(plan[0].at).getHours()).toBe(19);
    expect(plan[0]).toMatchObject({ title: 'Keep your 12-day streak', body: "15 more reviews to reach today's goal." });
    expect(plan[1].title).toBe('Time to practice');
  });

  it('skips today once the goal is met, or when the time has passed', () => {
    expect(planReminders(now, time, { goalMet: true, streak: 3, reviewed: 20, goal: 20 })).toHaveLength(6);
    expect(planReminders(now, { hour: 9, minute: 0 }, { goalMet: false, streak: 0, reviewed: 0, goal: 20 })).toHaveLength(6);
  });
});
