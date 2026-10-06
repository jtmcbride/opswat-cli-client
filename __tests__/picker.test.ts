import { DictIndex } from '@/lib/dictionary';
import { distractors, knownLemmaSet, pickExercise } from '@/lib/picker';

const index = new DictIndex([
  [
    { lemma: 'el', gloss: 'the', pos: 'art', forms: ['la'] },
    { lemma: 'ser', gloss: 'to be', pos: 'v', forms: ['es'] },
    { lemma: 'perro', gloss: 'dog', pos: 'n' },
    { lemma: 'gato', gloss: 'cat', pos: 'n' },
    { lemma: 'casa', gloss: 'house', pos: 'n' },
    { lemma: 'grande', gloss: 'big', pos: 'adj' },
    { lemma: 'pequeño', gloss: 'small', pos: 'adj', forms: ['pequeña'] },
  ],
]);
const sentences = [
  { text: 'El perro es grande.', translation: 'The dog is big.' },
  { text: 'La casa es pequeña.', translation: 'The house is small.' },
  { text: 'El gato es grande.', translation: 'The cat is big.' },
];

describe('pickExercise', () => {
  it('prefers sentences with exactly one unknown word', () => {
    const known = knownLemmaSet(['el', 'es', 'perro', 'grande'], index);
    const ex = pickExercise(sentences, index, known, { random: () => 0 })!;
    expect(ex.sentenceIndex).toBe(2);
    expect(ex.target).toBe('gato');
    expect(ex.unknown).toEqual(['gato']);
  });

  it('falls back to the fewest unknowns, targeting the most frequent', () => {
    const known = knownLemmaSet(['el', 'ser'], index);
    const ex = pickExercise(sentences, index, known, { random: () => 0 })!;
    expect(ex.unknown.length).toBe(2);
    expect(ex.target).toBe('perro');
  });

  it('respects exclusions and returns null when nothing is left', () => {
    const known = knownLemmaSet(['el', 'ser', 'perro', 'grande', 'gato'], index);
    expect(pickExercise(sentences, index, known, { exclude: new Set([1]) })).toBeNull();
  });
});

describe('distractors', () => {
  it('returns distinct glosses of the same part of speech', () => {
    const d = distractors(index, index.get('perro')!, 3, () => 0.5);
    expect(d).toHaveLength(3);
    expect(new Set(d).size).toBe(3);
    expect(d).not.toContain('dog');
    expect(d.every((g) => ['cat', 'house'].includes(g) || g)).toBe(true);
  });
});
