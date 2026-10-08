import type { AudioSegment } from '@/lib/types';
import { alignWordStarts, type TimedWord } from '@/lib/wordSync';

/** Pause between words that starts a new line, in seconds. */
const LINE_GAP = 1.2;
/** Longest line, in words, before it's broken even without punctuation. */
const MAX_LINE_WORDS = 30;
const SENTENCE_END = /[.?!…。？！]["»”’)]*$/;

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Groups timed words (as on-device Whisper returns them, punctuation attached) into readable lines:
 * a line ends at the end of a sentence, at a long pause, or when it gets too long.
 */
export function linesFromWords(words: TimedWord[]): AudioSegment[] {
  const lines: AudioSegment[] = [];
  let current: TimedWord[] = [];
  const flush = () => {
    if (!current.length) return;
    const text = current
      .map((w) => w.word)
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    const start = round(current[0].start);
    const end = round(current[current.length - 1].end);
    if (text) lines.push({ start, end, text, wordStarts: alignWordStarts(text, current, start, end) });
    current = [];
  };
  words.forEach((w, i) => {
    const next = words[i + 1];
    // Words come with their leading space; make sure joined words stay separated.
    current.push(current.length && !/^\s/.test(w.word) ? { ...w, word: ` ${w.word}` } : w);
    const sentenceEnds = SENTENCE_END.test(w.word.trim());
    const pause = next ? next.start - w.end >= LINE_GAP : true;
    if (sentenceEnds || pause || current.length >= MAX_LINE_WORDS) flush();
  });
  flush();
  return lines;
}

/**
 * Index in `samples` (between `from` and `to`) at the quietest 100 ms stretch, for cutting audio into
 * windows without splitting a word.
 */
export function quietestCut(samples: Float32Array, from: number, to: number, rate: number): number {
  const frame = Math.max(1, Math.round(rate / 10));
  let best = to;
  let bestEnergy = Infinity;
  for (let i = from; i + frame <= to; i += frame) {
    let energy = 0;
    for (let k = i; k < i + frame; k++) energy += samples[k] * samples[k];
    if (energy < bestEnergy) {
      bestEnergy = energy;
      best = i + (frame >> 1);
    }
  }
  return best;
}
