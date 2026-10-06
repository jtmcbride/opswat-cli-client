import { parseDictionary } from '@/lib/importParser';

describe('parseDictionary', () => {
  it('parses TSV with a header and Anki comments', () => {
    const r = parseDictionary('#separator:tab\nword\ttranslation\ncasa\t<b>house</b>\nperro\tdog\tn\n');
    expect(r.entries).toEqual([
      { lemma: 'casa', gloss: 'house' },
      { lemma: 'perro', gloss: 'dog', pos: 'n' },
    ]);
  });

  it('parses quoted CSV', () => {
    const r = parseDictionary('hola,"hello, hi"\nbad line\n');
    expect(r.entries).toEqual([{ lemma: 'hola', gloss: 'hello, hi' }]);
    expect(r.skipped).toBe(1);
  });

  it('parses "word = meaning" lines', () => {
    expect(parseDictionary('Haus = house').entries).toEqual([{ lemma: 'Haus', gloss: 'house' }]);
  });

  it('parses JSON in several shapes', () => {
    expect(parseDictionary('[{"word":"a","translation":"b","forms":["c"]}]').entries).toEqual([
      { lemma: 'a', gloss: 'b', forms: ['c'] },
    ]);
    expect(parseDictionary('[["a","b","n"]]').entries).toEqual([{ lemma: 'a', gloss: 'b', pos: 'n' }]);
    expect(parseDictionary('{"a":"b"}').entries).toEqual([{ lemma: 'a', gloss: 'b' }]);
  });
});
