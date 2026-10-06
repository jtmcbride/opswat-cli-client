import type { KnownWord, SrsState } from './types';

export type Strength = 'new' | 'learning' | 'familiar' | 'mastered';
export const STRENGTHS: Strength[] = ['new', 'learning', 'familiar', 'mastered'];

/** Memory stability (days) from which a word counts as familiar / mastered. */
export const FAMILIAR_DAYS = 7;
export const MASTERED_DAYS = 21;

export function strengthOf(srs: SrsState): Strength {
  if (srs.state === 'new') return 'new';
  if (srs.state !== 'review' || srs.stability < FAMILIAR_DAYS) return 'learning';
  return srs.stability < MASTERED_DAYS ? 'familiar' : 'mastered';
}

/** How many words are at each strength, by recognition (word → meaning) and by production. */
export function strengthCounts(words: KnownWord[]) {
  const zero = (): Record<Strength, number> => ({ new: 0, learning: 0, familiar: 0, mastered: 0 });
  const recognize = zero();
  const produce = zero();
  for (const w of words) {
    if (w.suspended) continue;
    recognize[strengthOf(w.srs)]++;
    produce[w.produce ? strengthOf(w.produce) : 'new']++;
  }
  return { recognize, produce };
}
