import { alignWordStarts, wordAt, wordsByLine, type TimedWord } from '@/lib/wordSync';

const w = (word: string, start: number, end = start + 0.4): TimedWord => ({ word, start, end });

describe('alignWordStarts', () => {
  it('matches words in order, ignoring punctuation, case and accents', () => {
    expect(alignWordStarts('¿Qué tal? Muy bien.', [w('que', 1), w('Tal', 1.5), w('muy', 2), w('bien', 2.4)], 1, 3)).toEqual([
      1, 1.5, 2, 2.4,
    ]);
  });

  it('splits a heard word that holds two display words', () => {
    expect(alignWordStarts('va-t-il', [w('va', 0, 1)], 0, 1)).toEqual([0]); // one display token
    expect(alignWordStarts('rendez vous', [w('rendez vous', 2, 3)], 2, 3)).toEqual([2, 2.5]);
  });

  it('tolerates substitutions and extra words on either side', () => {
    // "okay" heard as "ok" (substitution), an extra heard filler "eh", and a shown word that wasn't heard ("muy").
    const starts = alignWordStarts('Okay, es muy bueno', [w('ok', 0), w('eh', 0.5), w('es', 1), w('bueno', 2)], 0, 3);
    expect(starts[0]).toBe(0);
    expect(starts[1]).toBe(1);
    expect(starts[3]).toBe(2);
    expect(starts[2]).toBeGreaterThan(1);
    expect(starts[2]).toBeLessThan(2);
  });

  it('interpolates when nothing was heard and never goes backwards', () => {
    expect(alignWordStarts('uno dos tres', [], 0, 3)).toEqual([0.75, 1.5, 2.25]);
    const starts = alignWordStarts('a b c', [w('a', 5), w('b', 4), w('c', 6)], 4, 7);
    expect(starts).toEqual([5, 5, 6]);
  });
});

describe('wordsByLine', () => {
  it('assigns words to the line containing their midpoint', () => {
    const lines = [
      { start: 0, end: 2 },
      { start: 2, end: 4 },
    ];
    const grouped = wordsByLine(lines, [w('a', 0.1), w('b', 1.9, 2.3), w('c', 3), w('d', 9)]);
    expect(grouped.map((g) => g.map((x) => x.word))).toEqual([['a'], ['b', 'c', 'd']]);
  });
});

describe('wordAt', () => {
  it('finds the last word that has started', () => {
    expect(wordAt([1, 2, 3], 0.5)).toBe(-1);
    expect(wordAt([1, 2, 3], 1)).toBe(0);
    expect(wordAt([1, 2, 3], 2.9)).toBe(1);
    expect(wordAt([1, 2, 3], 99)).toBe(2);
  });
});
