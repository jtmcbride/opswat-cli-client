import { BUILTIN_LANGUAGES, loadBuiltinDictionary, starterDictionary } from '@/data';
import { DictIndex } from '@/lib/dictionary';
import { normalize } from '@/lib/tokenize';

describe.each(BUILTIN_LANGUAGES.map((l) => l.code))('built-in dictionary %s', (code) => {
  const starter = starterDictionary(code)!;

  it('has well-formed starter entries', () => {
    expect(starter.entries.length).toBeGreaterThan(150);
    for (const e of starter.entries) {
      expect(e.lemma).toBeTruthy();
      expect(e.gloss).toBeTruthy();
    }
  });

  it('has no duplicate starter lemmas', () => {
    const seen = new Set<string>();
    const dupes = starter.entries.map((e) => normalize(e.lemma)).filter((l) => seen.has(l) || !seen.add(l));
    expect(dupes).toEqual([]);
  });

  it('has starter sentences with translations', () => {
    expect(starter.sentences.length).toBeGreaterThan(60);
    for (const s of starter.sentences) {
      expect(s.text).toBeTruthy();
      expect(s.translation).toBeTruthy();
    }
  });

  it('resolves common inflections through the curated starter forms', async () => {
    const full = (await loadBuiltinDictionary(code))!;
    const index = new DictIndex([full.entries]);
    const checks: Record<string, [string, string][]> = {
      es: [['la', 'el'], ['es', 'ser']],
      fr: [['est', 'être'], ['la', 'le']],
      de: [['ist', 'sein'], ['die', 'der']],
      it: [['è', 'essere'], ['la', 'il']],
      pt: [['é', 'ser'], ['a', 'a']],
    };
    for (const [form, lemma] of checks[code]) expect(index.lemmaOf(form)).toBe(lemma);
  });

  it('covers every word used in its sentences, including generated data', async () => {
    const full = (await loadBuiltinDictionary(code))!;
    const index = new DictIndex([full.entries]);
    const missing = new Set<string>();
    for (const s of full.sentences) {
      for (const lemma of index.sentenceLemmas(s.text)) {
        if (!index.get(lemma)) missing.add(`${lemma} (in "${s.text}")`);
      }
    }
    expect([...missing].slice(0, 20)).toEqual([]);
  });
});
