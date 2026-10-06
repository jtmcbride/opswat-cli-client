import { shuffle } from './picker';
import type { DictEntry } from './types';

/** Frequency-rank bands, [from, to] inclusive. */
export const BANDS: [number, number][] = [
  [1, 100],
  [101, 250],
  [251, 500],
  [501, 1000],
  [1001, 2000],
  [2001, 3500],
  [3501, 5000],
];
export const WORDS_PER_BAND = 8;
export const CHECKS_PER_BAND = 2;
/** Stop once fewer than this share of a band's words are known. */
export const STOP_BELOW = 0.25;

export interface BandResult {
  band: number;
  shown: number;
  claimed: number;
  checks: number;
  checksCorrect: number;
}

/** Share of a band the learner knows: claimed share, discounted by failed spot checks. */
export function bandScore(r: BandResult): number {
  if (!r.shown) return 0;
  const claimed = r.claimed / r.shown;
  return r.checks ? claimed * (r.checksCorrect / r.checks) : claimed;
}

export function sampleBand(entries: DictEntry[], band: number, random = Math.random): DictEntry[] {
  const [from, to] = BANDS[band];
  const inBand = entries.filter((e) => e.rank !== undefined && e.rank >= from && e.rank <= to && e.gloss);
  return shuffle(inBand, random).slice(0, WORDS_PER_BAND);
}

export const shouldContinue = (r: BandResult) => r.band + 1 < BANDS.length && bandScore(r) >= STOP_BELOW;

/**
 * Estimated vocabulary: each tested band contributes score × band size. Untested bands below the
 * last one tested can't exist (the test starts at the top), and bands above it count as unknown.
 */
export function estimateVocabulary(results: BandResult[]): number {
  return Math.round(
    results.reduce((sum, r) => {
      const [from, to] = BANDS[r.band];
      return sum + bandScore(r) * (to - from + 1);
    }, 0),
  );
}

/**
 * Which words to mark known: whole bands the learner clearly knows, plus the most frequent part of
 * partially known bands in proportion to their score.
 */
export function wordsToMark(entries: DictEntry[], results: BandResult[]): DictEntry[] {
  const out: DictEntry[] = [];
  for (const r of results) {
    const [from, to] = BANDS[r.band];
    const inBand = entries
      .filter((e) => e.rank !== undefined && e.rank >= from && e.rank <= to)
      .sort((a, b) => a.rank! - b.rank!);
    const share = bandScore(r) >= 0.85 ? 1 : bandScore(r);
    out.push(...inBand.slice(0, Math.round(inBand.length * share)));
  }
  return out;
}
