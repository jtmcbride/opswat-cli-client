import { cleanGloss, parseFrequencyList, rankLemmas, selectSentences, toGenerated, WikiIndex } from '../tools/build-data/lib';
import { DictIndex } from '@/lib/dictionary';

function wiki() {
  const w = new WikiIndex();
  w.add({
    word: 'tener',
    pos: 'verb',
    senses: [{ glosses: ['to have'] }, { glosses: ['to hold'] }, { glosses: ['to own'], tags: ['archaic'] }],
    forms: [
      { form: 'tengo', tags: ['first-person', 'present'] },
      { form: 'tiene' },
      { form: 'no-table-tags', tags: ['table-tags'] },
      { form: 'me tengo' },
    ],
  });
  w.add({ word: 'tengo', pos: 'verb', senses: [{ glosses: ['first-person singular of tener'], form_of: [{ word: 'tener' }] }] });
  w.add({ word: 'tiene', pos: 'verb', senses: [{ glosses: ['third-person of tener'], form_of: [{ word: 'tener' }] }] });
  w.add({ word: 'perro', pos: 'noun', senses: [{ glosses: ['dog'] }] });
  w.add({ word: 'yo', pos: 'pron', senses: [{ glosses: ['I'] }] });
  w.add({ word: 'un', pos: 'article', senses: [{ glosses: ['a, an'] }], forms: [{ form: 'una' }] });
  w.add({ word: 'Juan', pos: 'name', senses: [{ glosses: ['John'] }] });
  w.add({ word: 'por favor', pos: 'intj', senses: [{ glosses: ['please'] }] });
  return w;
}

describe('WikiIndex', () => {
  it('collects glosses, forms and form-of links, skipping names and phrases', () => {
    const w = wiki();
    expect(w.lemmas.get('tener')?.glosses).toEqual(['to have', 'to hold']);
    expect([...w.lemmas.get('tener')!.forms]).toEqual(['tengo', 'tiene']);
    expect([...w.formOf.get('tengo')!]).toEqual(['tener']);
    expect(w.lemmas.has('juan')).toBe(false);
    expect(w.lemmas.has('por favor')).toBe(false);
  });
});

describe('cleanGloss', () => {
  it('drops trailing periods and shortens long glosses at a clause boundary', () => {
    expect(cleanGloss('to have.')).toBe('to have');
    expect(cleanGloss('Alternative form of x')).toBeNull();
    const g = cleanGloss('used to express something, especially in very long and rambling dictionary definitions')!;
    expect(g.length).toBeLessThanOrEqual(60);
    expect(g).toBe('used to express something');
  });
});

describe('rankLemmas', () => {
  it('ranks lemmas by summed form frequency and keeps observed forms', () => {
    const freq = parseFrequencyList('perro 50\ntengo 40\ntiene 30\nyo 60\n123 999\nzzz 5\n');
    const entries = rankLemmas(freq, wiki(), 10);
    expect(entries.map((e) => e.lemma)).toEqual(['tener', 'yo', 'perro']);
    expect(entries[0]).toMatchObject({ gloss: 'to have; to hold', pos: 'v', rank: 1, forms: ['tengo', 'tiene'] });
  });
});

describe('selectSentences', () => {
  it('keeps fully covered sentences, bucketed by their rarest word', () => {
    const index = new DictIndex([
      [
        { lemma: 'yo', gloss: 'I', rank: 1 },
        { lemma: 'tener', gloss: 'to have', rank: 2, forms: ['tengo'] },
        { lemma: 'un', gloss: 'a', rank: 3, forms: ['una'] },
        { lemma: 'perro', gloss: 'dog', rank: 4 },
      ],
    ]);
    const out = selectSentences(
      [
        { text: 'Yo tengo un perro.', translation: 'I have a dog.' },
        { text: 'Tengo un perro.', translation: 'I have a dog.' },
        { text: 'Tengo un gato.', translation: 'I have a cat.' },
        { text: 'Yo tengo.', translation: 'I have.' },
        { text: 'tengo un perro.', translation: 'dup' },
      ],
      index,
      { perLemma: 1 },
    );
    expect(out.map((s) => s.text)).toEqual(['Yo tengo.', 'Tengo un perro.']);
  });
});

describe('toGenerated', () => {
  it('writes compact tuples', () => {
    const g = toGenerated('es', [{ lemma: 'a', gloss: 'b', pos: 'n' }, { lemma: 'c', gloss: 'd', forms: ['e'] }], [{ text: 'x', translation: 'y' }], []);
    expect(g.entries).toEqual([['a', 'b', 'n'], ['c', 'd', '', ['e']]]);
    expect(g.sentences).toEqual([['x', 'y']]);
  });
});
