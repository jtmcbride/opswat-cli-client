import type { DictEntry, DictionaryData, SentencePair } from '@/lib/types';

/**
 * Built-in dictionaries are authored in a compact, diff-friendly text format:
 *
 *   entries:   lemma | gloss | pos | form1, form2, ...      (ordered by frequency)
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
    const [lemma, gloss, pos, forms] = line.split('|').map((c) => c.trim());
    return {
      lemma,
      gloss,
      rank: i + 1,
      ...(pos ? { pos } : {}),
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
    entries: g.entries.map(([lemma, gloss, pos, forms], i) => ({
      lemma,
      gloss,
      rank: i + 1,
      ...(pos ? { pos } : {}),
      ...(forms?.length ? { forms } : {}),
    })),
    sentences: g.sentences.map(([text, translation]) => ({ text, translation })),
  };
}
