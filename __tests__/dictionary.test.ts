import { DictIndex } from '@/lib/dictionary';
import { tokenize } from '@/lib/tokenize';

const index = new DictIndex([
  [
    { lemma: 'tener', gloss: 'to have', pos: 'v', forms: ['tengo', 'tiene'] },
    { lemma: 'Haus', gloss: 'house', pos: 'n' },
    { lemma: 'le', gloss: 'the', forms: ["l'"] },
    { lemma: 'homme', gloss: 'man' },
    { lemma: "aujourd'hui", gloss: 'today' },
    { lemma: 'est', gloss: 'is' },
    { lemma: 'il', gloss: 'he' },
  ],
  [{ lemma: 'tener', gloss: 'to have; to hold' }],
]);

describe('tokenize', () => {
  it('keeps punctuation and splits words', () => {
    const toks = tokenize('¡Hola, mundo!');
    expect(toks.filter((t) => t.isWord).map((t) => t.norm)).toEqual(['hola', 'mundo']);
    expect(toks.map((t) => t.text).join('')).toBe('¡Hola, mundo!');
  });
});

describe('DictIndex', () => {
  it('resolves inflected forms to lemmas', () => {
    expect(index.lemmaOf('Tengo')).toBe('tener');
    expect(index.lookup('tiene')?.lemma).toBe('tener');
  });

  it('lets later sources override glosses but keeps rank and forms', () => {
    const e = index.get('tener')!;
    expect(e.gloss).toBe('to have; to hold');
    expect(e.rank).toBe(1);
    expect(e.forms).toContain('tengo');
  });

  it('is case-insensitive but keeps display casing', () => {
    expect(index.get('haus')?.lemma).toBe('Haus');
  });

  it('splits elisions and hyphens only when the whole token is unknown', () => {
    expect(index.sentenceLemmas("L'homme est-il là aujourd'hui ?")).toEqual([
      'le',
      'homme',
      'est',
      'il',
      'là',
      "aujourd'hui",
    ]);
  });

  it('searches by prefix, exact match first', () => {
    expect(index.search('ten').map((e) => e.lemma)).toEqual(['tener']);
    expect(index.search('tie').map((e) => e.lemma)).toEqual(['tener']);
  });
});

describe('mergeWithStarter', () => {
  it('lets curated inflections win over generated homographs, and starter glosses win', () => {
    const { mergeWithStarter } = jest.requireActual('@/data/format');
    const merged = mergeWithStarter(
      [
        { lemma: 'est', gloss: 'east', rank: 7 },
        { lemma: 'être', gloss: 'to exist', rank: 2 },
        { lemma: 'chat', gloss: 'cat', rank: 900 },
        { lemma: 'paso', gloss: 'step', rank: 300, forms: ['pasos'] },
      ],
      [
        { lemma: 'être', gloss: 'to be', rank: 1, forms: ['est', 'suis'] },
        { lemma: 'pasar', gloss: 'to pass', rank: 2, forms: ['paso'] },
      ],
    );
    const idx = new DictIndex([merged]);
    expect(idx.lemmaOf('est')).toBe('être');
    expect(idx.lemmaOf('paso')).toBe('pasar');
    // The homograph's own forms still resolve, but it ranks after everything else.
    expect(idx.lemmaOf('pasos')).toBe('paso');
    expect(idx.get('est')!.rank).toBeGreaterThan(900);
    expect(idx.get('être')).toMatchObject({ gloss: 'to be', rank: 2 });
    expect(idx.get('chat')?.rank).toBe(900);
  });
});
