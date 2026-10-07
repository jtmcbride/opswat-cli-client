import { fold } from './recall';
import { tokenize } from './tokenize';

export interface SpokenWord {
  text: string;
  heard: boolean;
}

export interface SpeechMatch {
  words: SpokenWord[];
  /** Share of target words recognised, 0..1. */
  score: number;
  transcript: string;
}

const wordsOf = (s: string) => tokenize(s).filter((t) => t.isWord || /\d/.test(t.text));

/**
 * Compares what the recognizer heard with the target text: longest common subsequence over
 * accent-folded words, so each target word is marked heard or missed. The best of several
 * recognition alternatives wins.
 */
export function matchSpeech(target: string, transcripts: string[]): SpeechMatch {
  const goal = wordsOf(target);
  let best: SpeechMatch = { words: goal.map((t) => ({ text: t.text, heard: false })), score: 0, transcript: transcripts[0] ?? '' };
  for (const transcript of transcripts) {
    const a = goal.map((t) => fold(t.text));
    const b = wordsOf(transcript).map((t) => fold(t.text));
    // LCS table.
    const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
    for (let i = a.length - 1; i >= 0; i--)
      for (let j = b.length - 1; j >= 0; j--)
        dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const heard = new Array<boolean>(a.length).fill(false);
    for (let i = 0, j = 0; i < a.length && j < b.length; ) {
      if (a[i] === b[j]) {
        heard[i] = true;
        i++;
        j++;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
      else j++;
    }
    const score = a.length ? heard.filter(Boolean).length / a.length : 0;
    if (score > best.score || (score === best.score && transcript === transcripts[0])) {
      best = { words: goal.map((t, k) => ({ text: t.text, heard: heard[k] })), score, transcript };
    }
  }
  return best;
}
