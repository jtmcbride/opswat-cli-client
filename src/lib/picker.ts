import type { DictIndex } from './dictionary';
import { normalize } from './tokenize';
import type { DictEntry, SentencePair } from './types';

export interface Exercise {
  sentenceIndex: number;
  sentence: SentencePair;
  /** Lemma key of the new word being introduced. */
  target: string;
  /** All unknown lemma keys in the sentence (includes target). */
  unknown: string[];
}

/** Builds the set of lemma keys the learner knows, resolving inflected forms they entered. */
export function knownLemmaSet(words: string[], index: DictIndex): Set<string> {
  const set = new Set<string>();
  for (const w of words) {
    set.add(normalize(w));
    set.add(index.lemmaOf(w));
  }
  return set;
}

export function unknownLemmas(text: string, index: DictIndex, known: Set<string>): string[] {
  return [...new Set(index.sentenceLemmas(text).filter((l) => !known.has(l)))];
}

const rankOf = (index: DictIndex, lemma: string) => index.get(lemma)?.rank ?? 1e9;

/**
 * Picks an "i+1" sentence: ideally every word known except one. If none exists (e.g. a brand-new
 * learner) it falls back to the sentences with the fewest unknown words. The target is the most
 * frequent unknown word. Picks randomly among the best few candidates so practice varies.
 */
export function pickExercise(
  sentences: SentencePair[],
  index: DictIndex,
  known: Set<string>,
  opts: { exclude?: Set<number>; random?: () => number; pool?: number } = {},
): Exercise | null {
  const { exclude = new Set(), random = Math.random, pool = 5 } = opts;
  let best: Exercise[] = [];
  let bestCount = Infinity;

  sentences.forEach((sentence, sentenceIndex) => {
    if (exclude.has(sentenceIndex)) return;
    const unknown = unknownLemmas(sentence.text, index, known);
    if (unknown.length === 0 || unknown.length > bestCount) return;
    const target = unknown.reduce((a, b) => (rankOf(index, b) < rankOf(index, a) ? b : a));
    const ex = { sentenceIndex, sentence, target, unknown };
    if (unknown.length < bestCount) {
      bestCount = unknown.length;
      best = [ex];
    } else {
      best.push(ex);
    }
  });

  if (best.length === 0) return null;
  best.sort((a, b) => rankOf(index, a.target) - rankOf(index, b.target));
  // Keep the pool to sentences introducing the same few most-frequent targets.
  const top = best.slice(0, pool);
  return top[Math.floor(random() * top.length)];
}

/** Multiple-choice distractor glosses: other words of the same part of speech near the target's rank. */
export function distractors(index: DictIndex, target: DictEntry, n = 3, random = Math.random): string[] {
  const candidates = index.entries.filter(
    (e) =>
      normalize(e.lemma) !== normalize(target.lemma) &&
      e.gloss !== target.gloss &&
      (!target.pos || e.pos === target.pos),
  );
  const pool = candidates.length >= n ? candidates : index.entries.filter((e) => e.gloss !== target.gloss);
  const r = target.rank ?? 0;
  const near = [...pool].sort((a, b) => Math.abs((a.rank ?? 0) - r) - Math.abs((b.rank ?? 0) - r)).slice(0, n * 4);
  const out: string[] = [];
  while (out.length < n && near.length) {
    const [e] = near.splice(Math.floor(random() * near.length), 1);
    if (!out.includes(e.gloss)) out.push(e.gloss);
  }
  return out;
}

export function shuffle<T>(arr: T[], random = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Small deterministic PRNG (mulberry32) so picks are stable across re-renders. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
