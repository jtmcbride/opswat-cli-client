import { normalize } from '@/lib/tokenize';
import type { DictEntry, DictionaryData, SentencePair } from '@/lib/types';

/**
 * Built-in dictionaries are authored in a compact, diff-friendly text format:
 *
 *   entries:   lemma | gloss | pos | form1, form2, ...      (ordered by frequency; pos may carry a
 *              noun's gender: "n:f")
 *   sentences: text | translation
 *
 * Blank lines and lines starting with `#` are ignored.
 */
export interface RawDictionary {
  lang: string;
  name: string;
  entries: string;
  sentences: string;
}

const lines = (s: string) =>
  s
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

export function parseRawDictionary(raw: RawDictionary): DictionaryData {
  const entries: DictEntry[] = lines(raw.entries).map((line, i) => {
    const [lemma, gloss, posField, forms] = line.split('|').map((c) => c.trim());
    const [pos, gender] = (posField ?? '').split(':');
    return {
      lemma,
      gloss,
      rank: i + 1,
      ...(pos ? { pos } : {}),
      ...(gender ? { gender } : {}),
      ...(forms ? { forms: forms.split(',').map((f) => f.trim()).filter(Boolean) } : {}),
    };
  });
  const sentences: SentencePair[] = lines(raw.sentences).map((line) => {
    const [text, translation] = line.split('|').map((c) => c.trim());
    return { text, translation };
  });
  return { lang: raw.lang, name: raw.name, entries, sentences };
}

/**
 * Dictionaries generated from open data by tools/build-data, stored as tuples to keep them small:
 * entries are `[lemma, gloss, pos, forms?]` in frequency order, sentences `[text, translation]`.
 */
export interface GeneratedDictionary {
  lang: string;
  sources: string[];
  entries: [string, string, string, string[]?][];
  sentences: [string, string][];
}

export function parseGenerated(g: GeneratedDictionary): { entries: DictEntry[]; sentences: SentencePair[] } {
  return {
    entries: g.entries.map(([lemma, gloss, posField, forms], i) => {
      const [pos, gender] = posField.split(':');
      return {
        lemma,
        gloss,
        rank: i + 1,
        ...(pos ? { pos } : {}),
        ...(gender ? { gender } : {}),
        ...(forms?.length ? { forms } : {}),
      };
    }),
    sentences: g.sentences.map(([text, translation]) => ({ text, translation })),
  };
}

/**
 * Merges generated entries with the curated starter set. Starter glosses win and starter-only words
 * are appended. Where a generated headword is also a curated inflection (French "est" east /
 * "être"; Spanish "paso" step / "pasar"), the curated reading wins in text, and the generated entry
 * is kept (so its own forms, like "pasos", still resolve) but ranked last, so it isn't offered as a
 * common word.
 */
export function mergeWithStarter(generated: DictEntry[], starter: DictEntry[]): DictEntry[] {
  const starterLemmas = new Set(starter.map((e) => normalize(e.lemma)));
  const starterForms = new Set(
    starter.flatMap((e) => (e.forms ?? []).map(normalize)).filter((f) => !starterLemmas.has(f)),
  );
  const homograph = (e: DictEntry) => starterForms.has(normalize(e.lemma));
  return [
    ...generated.filter((e) => !homograph(e)),
    ...starter.map(({ rank: _rank, ...e }) => ({ ...e, formsWin: true })),
    ...generated.filter(homograph).map(({ rank: _rank, ...e }) => e),
  ];
}

/** Inflection tables, lazily loaded per language: `[form, index into tags]` per lemma. */
export interface Inflections {
  lang: string;
  /** Space-separated Wiktionary tag lists, e.g. "first-person indicative present singular". */
  tags: string[];
  lemmas: Record<string, [string, number][]>;
}
