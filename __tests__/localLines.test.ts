import { linesFromWords, quietestCut } from '@/lib/localLines';
import type { TimedWord } from '@/lib/wordSync';

const w = (word: string, start: number, end = start + 0.3): TimedWord => ({ word, start, end });

describe('linesFromWords', () => {
  it('breaks lines at sentence ends and long pauses, keeping word timings', () => {
    const lines = linesFromWords([
      w(' Hola,', 0.5),
      w(' ¿qué', 0.9),
      w(' tal?', 1.2),
      w(' Muy', 1.6),
      w(' bien', 1.9),
      w(' gracias', 4.0), // after a 1.8 s pause
    ]);
    expect(lines).toEqual([
      { start: 0.5, end: 1.5, text: 'Hola, ¿qué tal?', wordStarts: [0.5, 0.9, 1.2] },
      { start: 1.6, end: 2.2, text: 'Muy bien', wordStarts: [1.6, 1.9] },
      { start: 4, end: 4.3, text: 'gracias', wordStarts: [4] },
    ]);
  });

  it('caps very long lines', () => {
    const words = Array.from({ length: 65 }, (_, i) => w(' palabra', i * 0.3));
    expect(linesFromWords(words).map((l) => l.wordStarts?.length)).toEqual([30, 30, 5]);
  });

  it('keeps words separated even without leading spaces', () => {
    expect(linesFromWords([w('Hola', 0), w('amigo.', 0.4)])[0].text).toBe('Hola amigo.');
  });
});

describe('quietestCut', () => {
  it('finds the silent stretch', () => {
    const rate = 1000;
    const samples = new Float32Array(3000).map((_, i) => (i >= 1800 && i < 1900 ? 0 : Math.sin(i)));
    const cut = quietestCut(samples, 1000, 3000, rate);
    expect(cut).toBeGreaterThanOrEqual(1800);
    expect(cut).toBeLessThan(1900);
  });
});
