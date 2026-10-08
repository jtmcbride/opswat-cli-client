import { tokenize } from '@/lib/tokenize';

/** A word with timings, as Whisper returns it (no punctuation, may differ slightly from the line text). */
export interface TimedWord {
  word: string;
  start: number;
  end: number;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Comparable form: lowercase, no accents, no apostrophes or hyphens. */
const key = (s: string) =>
  s
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\p{M}'’\-]/gu, '');

/** The words of a line as the reader shows them (the tappable tokens, in order). */
export const displayWords = (text: string) => tokenize(text).filter((t) => t.isWord);

/**
 * Start time for each displayed word of `text`, matched in order against Whisper's timed words.
 * Small mismatches (a substituted spelling, an extra word on either side) are tolerated; words that
 * can't be matched get times interpolated from their neighbours. Times never go backwards.
 */
export function alignWordStarts(text: string, words: TimedWord[], lineStart: number, lineEnd: number): number[] {
  const shown = displayWords(text).map((t) => key(t.text));
  // Whisper "words" can hold several display tokens (e.g. "¿qué"), so split them the same way.
  const heard: { key: string; start: number }[] = [];
  for (const w of words) {
    const parts = displayWords(w.word);
    parts.forEach((p, k) =>
      heard.push({ key: key(p.text), start: w.start + ((w.end - w.start) * k) / Math.max(1, parts.length) }),
    );
  }

  const starts: (number | undefined)[] = new Array(shown.length).fill(undefined);
  const LOOKAHEAD = 3;
  let i = 0;
  let j = 0;
  while (i < shown.length && j < heard.length) {
    if (shown[i] === heard[j].key) {
      starts[i++] = heard[j++].start;
      continue;
    }
    // Look a few words ahead on each side for a resync point; take the nearer one.
    const skipHeard = heard.slice(j + 1, j + 1 + LOOKAHEAD).findIndex((h) => h.key === shown[i]);
    const skipShown = shown.slice(i + 1, i + 1 + LOOKAHEAD).indexOf(heard[j].key);
    if (skipHeard >= 0 && (skipShown < 0 || skipHeard <= skipShown)) j += skipHeard + 1;
    else if (skipShown >= 0) i += skipShown + 1;
    else starts[i++] = heard[j++].start; // Substitution: same position, different spelling.
  }

  // Fill gaps by interpolating between known neighbours (or the line's bounds), keeping order.
  const out: number[] = [];
  for (let k = 0; k < shown.length; k++) {
    if (starts[k] !== undefined) {
      out.push(Math.max(starts[k]!, out[k - 1] ?? lineStart));
      continue;
    }
    const prev = out[k - 1] ?? lineStart;
    let n = k + 1;
    while (n < shown.length && starts[n] === undefined) n++;
    const next = n < shown.length ? starts[n]! : lineEnd;
    out.push(prev + (Math.max(prev, next) - prev) / (n - k + 1));
  }
  return out.map(round);
}

/** Groups timed words by the line whose time range contains each word's midpoint. */
export function wordsByLine(lines: { start: number; end: number }[], words: TimedWord[]): TimedWord[][] {
  const out: TimedWord[][] = lines.map(() => []);
  if (!lines.length) return out;
  let li = 0;
  for (const w of [...words].sort((a, b) => a.start - b.start)) {
    const mid = (w.start + w.end) / 2;
    while (li < lines.length - 1 && mid >= lines[li].end) li++;
    out[li].push(w);
  }
  return out;
}

/** Index of the word being spoken at `time` (the last word that has started), or -1 before the first. */
export function wordAt(starts: number[], time: number): number {
  let lo = 0;
  let hi = starts.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (starts[mid] <= time) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
}
