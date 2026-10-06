import { DictIndex } from '@/lib/dictionary';
import { checkAnswer, chooseExercise, findContext, makeCloze } from '@/lib/recall';
import { newSrs } from '@/lib/srs';
import type { KnownWord } from '@/lib/types';

const index = new DictIndex([
  [
    { lemma: 'ella', gloss: 'she' },
    { lemma: 'leer', gloss: 'to read', forms: ['lee', 'leo'] },
    { lemma: 'un', gloss: 'a', forms: ['una'] },
    { lemma: 'libro', gloss: 'book' },
    { lemma: 'yo', gloss: 'I' },
    { lemma: 'le', gloss: 'the', forms: ["l'"] },
    { lemma: 'eau', gloss: 'water' },
  ],
]);

const word = (w: string, reps = 2, extra: Partial<KnownWord> = {}): KnownWord => ({
  id: `id-${w}`,
  lang: 'es',
  word: w,
  gloss: '',
  addedAt: 0,
  srs: { ...newSrs(0), reps },
  ...extra,
});

describe('checkAnswer', () => {
  it('grades exact, accent-only, typo and wrong answers', () => {
    expect(checkAnswer(' Está. ', 'está')).toBe('exact');
    expect(checkAnswer('esta', 'está')).toBe('accent');
    expect(checkAnswer('Grosse', 'Größe')).toBe('accent');
    expect(checkAnswer('librp', 'libro')).toBe('typo');
    expect(checkAnswer('casa', 'libro')).toBe('wrong');
    expect(checkAnswer('', 'libro')).toBe('wrong');
    expect(checkAnswer('ir', 'yo')).toBe('wrong');
  });
});

describe('chooseExercise', () => {
  it('uses flip for new cards and flip-only style', () => {
    expect(chooseExercise(word('libro', 0), { style: 'mixed', hasContext: true, canListen: true })).toBe('flip');
    expect(chooseExercise(word('libro', 5), { style: 'flip', hasContext: true, canListen: true })).toBe('flip');
  });

  it('only picks available exercises and is stable', () => {
    const opts = { style: 'mixed' as const, hasContext: false, canListen: false };
    expect(chooseExercise(word('libro', 3), opts)).toBe('type');
    const a = chooseExercise(word('libro', 3), { ...opts, hasContext: true, canListen: true });
    expect(chooseExercise(word('libro', 3), { ...opts, hasContext: true, canListen: true })).toBe(a);
  });
});

describe('cloze', () => {
  it('hides the inflected form used in the sentence', () => {
    const c = makeCloze({ text: 'Ella lee un libro.', translation: 'She reads a book.' }, 'leer', index)!;
    expect(c.before).toBe('Ella ');
    expect(c.answer).toBe('lee');
    expect(c.after).toBe(' un libro.');
  });

  it('skips words that are only part of an elided token', () => {
    expect(makeCloze({ text: "l'eau", translation: 'the water' }, 'le', index)).toBeNull();
  });

  it('prefers the saved context, else the shortest fully-known sentence', () => {
    const sentences = [
      { text: 'Ella lee un libro.', translation: '' },
      { text: 'Yo leo.', translation: '' },
      { text: 'Ella lee.', translation: '' },
    ];
    const known = new Set(['ella', 'un', 'libro']);
    expect(findContext(word('leer'), index, sentences, known)?.sentence.text).toBe('Ella lee.');
    const saved = word('leer', 2, { context: { text: 'Ella lee un libro.', translation: '' } });
    expect(findContext(saved, index, sentences, known)?.answer).toBe('lee');
    expect(findContext(word('libro'), index, [{ text: 'Yo leo.', translation: '' }], known)).toBeNull();
  });
});
