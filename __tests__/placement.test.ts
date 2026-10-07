import { seededRandom } from '@/lib/picker';
import { bandScore, BANDS, estimateVocabulary, sampleBand, shouldContinue, wordsToMark } from '@/lib/placement';
import type { DictEntry } from '@/lib/types';

const entries: DictEntry[] = Array.from({ length: 5000 }, (_, i) => ({ lemma: `w${i + 1}`, gloss: `g${i + 1}`, rank: i + 1 }));
const r = (band: number, claimed: number, checks = 0, checksCorrect = 0) => ({ band, shown: 8, claimed, checks, checksCorrect });

describe('placement', () => {
  it('samples distinct words from a band', () => {
    const s = sampleBand(entries, 2, seededRandom(1));
    expect(s).toHaveLength(8);
    expect(new Set(s.map((e) => e.lemma)).size).toBe(8);
    for (const e of s) expect(e.rank! >= 251 && e.rank! <= 500).toBe(true);
  });

  it('discounts claims by failed spot checks and stops when a band is mostly unknown', () => {
    expect(bandScore(r(0, 8, 2, 2))).toBe(1);
    expect(bandScore(r(0, 8, 2, 1))).toBe(0.5);
    expect(shouldContinue(r(0, 8))).toBe(true);
    expect(shouldContinue(r(3, 1))).toBe(false);
    expect(shouldContinue(r(BANDS.length - 1, 8))).toBe(false);
  });

  it('estimates vocabulary and picks the most frequent words in partial bands', () => {
    const results = [r(0, 8), r(1, 8), r(2, 4)];
    expect(estimateVocabulary(results)).toBe(100 + 150 + 125);
    const marked = wordsToMark(entries, results);
    expect(marked).toHaveLength(375);
    expect(marked.at(-1)?.rank).toBe(375);
  });
});
