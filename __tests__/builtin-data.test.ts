import { BUILTIN_LANGUAGES, builtinDictionary } from '@/data';
import { DictIndex } from '@/lib/dictionary';
import { normalize } from '@/lib/tokenize';

describe.each(BUILTIN_LANGUAGES.map((l) => l.code))('built-in dictionary %s', (code) => {
  const data = builtinDictionary(code)!;
  const index = new DictIndex([data.entries]);

  it('has well-formed entries', () => {
    expect(data.entries.length).toBeGreaterThan(150);
    for (const e of data.entries) {
      expect(e.lemma).toBeTruthy();
      expect(e.gloss).toBeTruthy();
    }
  });

  it('has no duplicate lemmas', () => {
    const seen = new Set<string>();
    const dupes = data.entries.map((e) => normalize(e.lemma)).filter((l) => seen.has(l) || !seen.add(l));
    expect(dupes).toEqual([]);
  });

  it('has sentences with translations', () => {
    expect(data.sentences.length).toBeGreaterThan(60);
    for (const s of data.sentences) {
      expect(s.text).toBeTruthy();
      expect(s.translation).toBeTruthy();
    }
  });

  it('covers every word used in its sentences', () => {
    const missing = new Set<string>();
    for (const s of data.sentences) {
      for (const lemma of index.sentenceLemmas(s.text)) {
        if (!index.get(lemma)) missing.add(lemma);
      }
    }
    expect([...missing]).toEqual([]);
  });
});
