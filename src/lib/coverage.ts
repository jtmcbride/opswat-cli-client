import type { DictIndex } from './dictionary';
import type { SentencePair } from './types';

interface Counts {
  byLemma: Map<string, number>;
  total: number;
}

const cache = new WeakMap<SentencePair[], WeakMap<DictIndex, Counts>>();

/** How often each dictionary word occurs in a sentence collection (computed once per collection). */
function lemmaCounts(sentences: SentencePair[], index: DictIndex): Counts {
  let perIndex = cache.get(sentences);
  if (!perIndex) cache.set(sentences, (perIndex = new WeakMap()));
  let counts = perIndex.get(index);
  if (!counts) {
    const byLemma = new Map<string, number>();
    let total = 0;
    for (const s of sentences) {
      for (const lemma of index.sentenceLemmas(s.text)) {
        // Words outside the dictionary are mostly names ("Tom"); leave them out.
        if (!index.get(lemma)) continue;
        byLemma.set(lemma, (byLemma.get(lemma) ?? 0) + 1);
        total++;
      }
    }
    perIndex.set(index, (counts = { byLemma, total }));
  }
  return counts;
}

export interface CorpusCoverage {
  /** Share of running words in everyday sentences that the learner knows. */
  ratio: number;
  /** The unknown words that would raise coverage most, with the share each adds. */
  next: { lemma: string; gain: number }[];
}

export function corpusCoverage(sentences: SentencePair[], index: DictIndex, known: Set<string>, nextCount = 5): CorpusCoverage | null {
  const { byLemma, total } = lemmaCounts(sentences, index);
  if (!total) return null;
  let covered = 0;
  const unknown: [string, number][] = [];
  for (const [lemma, n] of byLemma) {
    if (known.has(lemma)) covered += n;
    else unknown.push([lemma, n]);
  }
  unknown.sort((a, b) => b[1] - a[1]);
  return { ratio: covered / total, next: unknown.slice(0, nextCount).map(([lemma, n]) => ({ lemma, gain: n / total })) };
}
