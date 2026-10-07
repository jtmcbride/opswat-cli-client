import { buildQueue, startOfDay, type ReviewCard } from '@/lib/queue';
import { newSrs, schedule } from '@/lib/srs';
import type { KnownWord } from '@/lib/types';

const now = new Date(2026, 9, 6, 15, 0).getTime();
const DAY = 86400000;
let n = 0;
const word = (srs = newSrs(now), extra: Partial<KnownWord> = {}): KnownWord => ({
  id: `w${n++}`,
  lang: 'es',
  word: `w${n}`,
  gloss: '',
  addedAt: n,
  srs,
  ...extra,
});

describe('buildQueue', () => {
  it('puts due reviews first, then new cards up to the daily limit', () => {
    const reviewed = schedule(newSrs(now - 10 * DAY), 'good', now - 10 * DAY); // due 3 days later: overdue
    const future = schedule(newSrs(now - 2 * DAY), 'easy', now - 2 * DAY); // due in 2 weeks
    const words = [word(), word(reviewed), word(), word(future), word()];
    const q = buildQueue(words, now, 2, ['recognize']);
    expect(q.cards.map((c) => c.word.id)).toEqual([words[1].id, words[0].id, words[2].id]);
    expect(q).toMatchObject({ reviews: 1, newCards: 2, newRemaining: 2 });
  });

  it('counts cards first reviewed today against the limit, and 0 means unlimited', () => {
    const introduced = schedule(newSrs(now), 'good', startOfDay(now) + 1000);
    const words = [word(introduced), word(), word(), word()];
    expect(buildQueue(words, now, 2, ['recognize']).newCards).toBe(1);
    expect(buildQueue(words, now, 0, ['recognize']).newCards).toBe(3);
  });

  it('skips suspended cards', () => {
    expect(buildQueue([word(newSrs(now), { suspended: true })], now, 20).cards).toEqual([]);
  });

  const ids = (cards: ReviewCard[]) => cards.map((c) => `${c.word.word}:${c.dir}`);

  it('adds a production card once a word is learned, alternating with new words', () => {
    n = 0;
    const learned = schedule(newSrs(now - 20 * DAY), 'easy', now - 20 * DAY);
    const a = word({ ...learned, due: now + 30 * DAY }); // learned, not due
    const b = word(); // new
    const q = buildQueue([a, b], now, 10);
    expect(ids(q.cards)).toEqual(['w1:produce', 'w2:recognize']);
    // Production only: every word gets a production card straight away.
    expect(ids(buildQueue([a, b], now, 10, ['produce']).cards)).toEqual(['w1:produce', 'w2:produce']);
  });

  it('schedules directions separately and keeps siblings apart', () => {
    n = 0;
    const learned = schedule(newSrs(now - 20 * DAY), 'good', now - 20 * DAY);
    const due = { ...learned, due: now - DAY };
    const both = word(due, { produce: due });
    expect(ids(buildQueue([both], now, 10).cards)).toEqual(['w1:recognize']);
    // Reviewed for recognition today: production waits until tomorrow.
    const today = schedule(due, 'good', now - 1000);
    expect(buildQueue([{ ...both, srs: today }], now, 10).cards).toEqual([]);
    expect(ids(buildQueue([{ ...both, srs: today }], now + DAY, 10).cards)).toEqual(['w1:produce']);
  });
});
