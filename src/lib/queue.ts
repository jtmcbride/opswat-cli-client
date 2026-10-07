import { isDue, isNew, newSrs } from './srs';
import type { CardDir, KnownWord, ReviewDirection, SrsState } from './types';

/** One flashcard: a word in one direction, each direction scheduled on its own. */
export interface ReviewCard {
  word: KnownWord;
  dir: CardDir;
  srs: SrsState;
  /** `${word.id}:${dir}` */
  id: string;
}

export interface ReviewQueue {
  /** Cards to study now: due reviews first, then new cards up to the daily limit. */
  cards: ReviewCard[];
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

const DIRECTIONS: Record<ReviewDirection, CardDir[]> = {
  target: ['recognize'],
  native: ['produce'],
  mixed: ['recognize', 'produce'],
};

/** Card directions for the review setting (same array each time, so it's safe in hook deps). */
export const directions = (setting: ReviewDirection): CardDir[] => DIRECTIONS[setting] ?? DIRECTIONS.mixed;

/**
 * A word's cards for the chosen directions. With both directions on, the production card is
 * introduced once the word has been learned for recognition.
 */
export function cardsOf(word: KnownWord, dirs: CardDir[]): ReviewCard[] {
  const out: ReviewCard[] = [];
  if (dirs.includes('recognize')) out.push({ word, dir: 'recognize', srs: word.srs, id: `${word.id}:recognize` });
  if (dirs.includes('produce')) {
    const ready = word.produce || !dirs.includes('recognize') || word.srs.state === 'review';
    if (ready) out.push({ word, dir: 'produce', srs: word.produce ?? newSrs(word.addedAt), id: `${word.id}:produce` });
  }
  return out;
}

const inLearning = (s: SrsState) => s.state === 'learning' || s.state === 'relearning';

export function buildQueue(
  words: KnownWord[],
  now: number,
  dailyNewLimit: number,
  dirs: CardDir[] = ['recognize', 'produce'],
): ReviewQueue {
  const today = startOfDay(now);
  const cards = words.filter((w) => !w.suspended).flatMap((w) => cardsOf(w, dirs));
  const introducedToday = cards.filter((c) => (c.srs.firstReview ?? 0) >= today).length;
  const newRemaining = dailyNewLimit > 0 ? Math.max(0, dailyNewLimit - introducedToday) : Infinity;

  // A word's other card waits until tomorrow once one was studied today, so one doesn't give
  // away the other (unless it's mid-relearning and due again within the session).
  const studiedToday = new Map<string, Set<CardDir>>();
  for (const c of cards) {
    if ((c.srs.lastReview ?? 0) >= today) studiedToday.set(c.word.id, (studiedToday.get(c.word.id) ?? new Set()).add(c.dir));
  }
  const buried = (c: ReviewCard) => {
    const done = studiedToday.get(c.word.id);
    return !!done && !done.has(c.dir) && !inLearning(c.srs);
  };

  const due = cards.filter((c) => !isNew(c.srs) && isDue(c.srs, now) && !buried(c)).sort((a, b) => a.srs.due - b.srs.due);
  // Only one card per word in a session's due list; the sibling comes back another day.
  const seen = new Set<string>();
  const reviews = due.filter((c) => (inLearning(c.srs) || !seen.has(c.word.id) ? (seen.add(c.word.id), true) : false));

  const byAdded = (a: ReviewCard, b: ReviewCard) => a.word.addedAt - b.word.addedAt;
  const freshOf = (dir: CardDir) =>
    cards.filter((c) => c.dir === dir && isNew(c.srs) && !buried(c) && !seen.has(c.word.id)).sort(byAdded);
  // Alternate new production cards (words you already recognize) with brand-new words.
  const produce = freshOf('produce');
  const recognize = freshOf('recognize');
  const fresh: ReviewCard[] = [];
  const picked = new Set<string>();
  for (let i = 0; fresh.length < newRemaining && (i < produce.length || i < recognize.length); i++) {
    for (const c of [produce[i], recognize[i]]) {
      if (c && fresh.length < newRemaining && !picked.has(c.word.id)) {
        fresh.push(c);
        picked.add(c.word.id);
      }
    }
  }

  return { cards: [...reviews, ...fresh], reviews: reviews.length, newCards: fresh.length, newRemaining };
}
