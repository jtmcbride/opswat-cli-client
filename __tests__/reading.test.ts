import { DictIndex } from '@/lib/dictionary';
import { coverage, splitParagraphs, splitSentences } from '@/lib/reading';

const index = new DictIndex([
  [
    { lemma: 'el', gloss: 'the', forms: ['la'] },
    { lemma: 'perro', gloss: 'dog' },
    { lemma: 'ser', gloss: 'to be', forms: ['es'] },
    { lemma: 'grande', gloss: 'big' },
    { lemma: 'gato', gloss: 'cat' },
    { lemma: 'y', gloss: 'and' },
  ],
]);

describe('splitting', () => {
  it('splits paragraphs and sentences, keeping punctuation', () => {
    expect(splitParagraphs('A b.\n\nC d.\nE')).toEqual(['A b.', 'C d.', 'E']);
    expect(splitSentences('Hola. ¿Qué tal? Bien… «Sí.» Fin')).toEqual(['Hola. ', '¿Qué tal? ', 'Bien… ', '«Sí.» ', 'Fin']);
  });
});

describe('coverage', () => {
  it('counts known running words, ignores mid-sentence names, ranks unknown words', () => {
    const known = new Set(['el', 'perro', 'ser']);
    const c = coverage('El perro es grande. El gato es grande y Pedro es el gato.', index, known);
    expect(c.total).toBe(12);
    expect(c.known).toBe(7);
    expect(c.ratio).toBeCloseTo(7 / 12);
    expect(c.unknown.map((u) => u.lemma)).toEqual(['grande', 'gato', 'y']);
  });
});
