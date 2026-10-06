import type { DictIndex } from './dictionary';
import { normalize, tokenize } from './tokenize';
import type { Grade, KnownWord, SentencePair } from './types';

export type ExerciseKind = 'flip' | 'type' | 'cloze' | 'listen';
export type AnswerResult = 'exact' | 'accent' | 'typo' | 'wrong';

const clean = (s: string) =>
  normalize(s.normalize('NFC'))
    .replace(/^[\s\p{P}]+|[\s\p{P}]+$/gu, '')
    .replace(/\s+/g, ' ');

/** Lowercase, accent-free form for lenient comparison ("Größe" -> "grosse"). */
export const fold = (s: string) =>
  clean(s)
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/\p{M}/gu, '');

function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Compares a typed answer with the expected word: exact, right but for accents, a small typo, or wrong. */
export function checkAnswer(input: string, expected: string): AnswerResult {
  const a = clean(input);
  const b = clean(expected);
  if (!a) return 'wrong';
  if (a === b) return 'exact';
  const fa = fold(a);
  const fb = fold(b);
  if (fa === fb) return 'accent';
  const allowed = fb.length >= 8 ? 2 : fb.length >= 4 ? 1 : 0;
  return levenshtein(fa, fb) <= allowed ? 'typo' : 'wrong';
}

export const SUGGESTED_GRADE: Record<AnswerResult, Grade> = {
  exact: 'good',
  accent: 'good',
  typo: 'hard',
  wrong: 'again',
};

/**
 * Picks the exercise for a due card. New cards start with recognition (flip); once seen, recall
 * exercises take over. The choice is deterministic per card and repetition so it doesn't change
 * on re-render.
 */
export function chooseExercise(
  card: KnownWord,
  opts: { style: 'flip' | 'mixed'; hasContext: boolean; canListen: boolean },
): ExerciseKind {
  // New and just-forgotten cards are shown as flip cards (recognition) before recall is asked for.
  if (opts.style === 'flip' || card.srs.state !== 'review' || !card.word.trim()) return 'flip';
  const kinds: ExerciseKind[] = ['type'];
  if (opts.hasContext) kinds.push('cloze', 'cloze');
  if (opts.canListen) kinds.push('listen');
  let h = card.srs.reps * 31;
  for (const ch of card.id) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return kinds[h % kinds.length];
}

export interface Cloze {
  sentence: SentencePair;
  /** Sentence text split around the hidden word. */
  before: string;
  after: string;
  /** The exact form used in the sentence, e.g. "lee" for "leer". */
  answer: string;
}

/** Hides the first occurrence of a word (any inflection) in a sentence. */
export function makeCloze(sentence: SentencePair, word: string, index: DictIndex): Cloze | null {
  const target = index.lemmaOf(word);
  const tokens = tokenize(sentence.text);
  let offset = 0;
  for (const t of tokens) {
    if (t.isWord && (t.norm === normalize(word) || index.tokenLemmas(t.norm).includes(target))) {
      // Skip elided/hyphenated compounds where the word is only part of the token.
      if (index.tokenLemmas(t.norm).length === 1) {
        return {
          sentence,
          before: sentence.text.slice(0, offset),
          after: sentence.text.slice(offset + t.text.length),
          answer: t.text,
        };
      }
    }
    offset += t.text.length;
  }
  return null;
}

const lemmaIndexCache = new WeakMap<SentencePair[], Map<string, number[]>>();

/** lemma -> indexes of sentences containing it; built once per sentence list. */
function sentencesByLemma(sentences: SentencePair[], index: DictIndex) {
  let map = lemmaIndexCache.get(sentences);
  if (!map) {
    map = new Map();
    sentences.forEach((s, i) => {
      for (const l of new Set(index.sentenceLemmas(s.text))) {
        let list = map!.get(l);
        if (!list) map!.set(l, (list = []));
        list.push(i);
      }
    });
    lemmaIndexCache.set(sentences, map);
  }
  return map;
}

/**
 * A sentence to quiz a word in: the one it was learned from if saved, otherwise the shortest
 * sentence containing it where every other word is known.
 */
export function findContext(
  card: KnownWord,
  index: DictIndex,
  sentences: SentencePair[],
  known: Set<string>,
): Cloze | null {
  if (card.context) {
    const c = makeCloze(card.context, card.word, index);
    if (c) return c;
  }
  const lemma = index.lemmaOf(card.word);
  const ids = sentencesByLemma(sentences, index).get(lemma) ?? [];
  let best: Cloze | null = null;
  for (const i of ids) {
    const s = sentences[i];
    if (best && s.text.length >= best.sentence.text.length) continue;
    if (!index.sentenceLemmas(s.text).every((l) => l === lemma || known.has(l))) continue;
    const c = makeCloze(s, card.word, index);
    if (c) best = c;
  }
  return best;
}
