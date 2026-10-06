import type { DictIndex } from './dictionary';
import { tokenize } from './tokenize';

export interface Coverage {
  /** Word tokens counted (names excluded). */
  total: number;
  known: number;
  /** 0..1 share of running words the learner knows. */
  ratio: number;
  /** Unknown lemmas, most frequent first, with how often each appears in the text. */
  unknown: { lemma: string; count: number }[];
}

const SENTENCE_RE = /[^.!?…]+(?:[.!?…]+["'»”)\]]*\s*|$)/g;

/** Splits a paragraph into sentences, keeping punctuation and trailing spaces. */
export function splitSentences(paragraph: string): string[] {
  return paragraph.match(SENTENCE_RE)?.filter((s) => s.length > 0) ?? [paragraph];
}

export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * How much of a text the learner can read. Capitalized words that aren't in the dictionary and
 * don't start a sentence are treated as names and ignored.
 */
export function coverage(text: string, index: DictIndex, known: Set<string>): Coverage {
  let total = 0;
  let knownCount = 0;
  const unknown = new Map<string, number>();

  for (const paragraph of splitParagraphs(text)) {
    for (const sentence of splitSentences(paragraph)) {
      let first = true;
      for (const t of tokenize(sentence)) {
        if (!t.isWord) continue;
        const lemmas = index.tokenLemmas(t.norm);
        const inDict = lemmas.some((l) => index.get(l));
        const isName = !inDict && !first && /^\p{Lu}/u.test(t.text);
        first = false;
        if (isName) continue;
        total++;
        const missing = lemmas.filter((l) => !known.has(l));
        if (missing.length === 0) knownCount++;
        for (const l of missing) unknown.set(l, (unknown.get(l) ?? 0) + 1);
      }
    }
  }

  return {
    total,
    known: knownCount,
    ratio: total ? knownCount / total : 1,
    unknown: [...unknown.entries()]
      .map(([lemma, count]) => ({ lemma, count }))
      .sort((a, b) => b.count - a.count || (index.get(a.lemma)?.rank ?? 1e9) - (index.get(b.lemma)?.rank ?? 1e9)),
  };
}
