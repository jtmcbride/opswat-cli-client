import { localeFor } from './voices';
import type { LangCode } from './types';

/* Minimal typing for the Web Speech API (not in TypeScript's DOM lib everywhere). */
interface RecognitionResultList {
  length: number;
  [i: number]: { length: number; isFinal: boolean; [j: number]: { transcript: string } };
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: { results: RecognitionResultList }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

const Ctor: RecognitionCtor | undefined =
  typeof window !== 'undefined'
    ? ((window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition)
    : undefined;

/** Speech recognition is available in Chrome, Edge and Safari (incl. mobile); not in the native app yet. */
export const recognitionSupported = !!Ctor;

export class RecognitionError extends Error {}

const MESSAGES: Record<string, string> = {
  'not-allowed': 'Microphone access was blocked. Allow it in your browser settings.',
  'service-not-allowed': 'Speech recognition is not allowed in this browser.',
  'no-speech': "Didn't hear anything. Try again a bit closer to the microphone.",
  'audio-capture': 'No microphone found.',
  network: 'Speech recognition needs an internet connection.',
  'language-not-supported': 'Speech recognition does not support this language in this browser.',
};

/**
 * Listens for one utterance and resolves with the recognizer's alternatives (best first).
 * Call `stop()` to finish early.
 */
export function listen(lang: LangCode): { result: Promise<string[]>; stop: () => void } {
  if (!Ctor) return { result: Promise.reject(new RecognitionError('Speech recognition is not supported here.')), stop: () => {} };
  const rec = new Ctor();
  rec.lang = localeFor(lang);
  rec.interimResults = false;
  rec.continuous = false;
  rec.maxAlternatives = 5;
  const result = new Promise<string[]>((resolve, reject) => {
    let alternatives: string[] = [];
    rec.onresult = (e) => {
      const r = e.results[e.results.length - 1];
      alternatives = Array.from({ length: r.length }, (_, j) => r[j].transcript.trim()).filter(Boolean);
    };
    rec.onerror = (e) => {
      if (e.error === 'aborted') return;
      reject(new RecognitionError(MESSAGES[e.error] ?? `Speech recognition error: ${e.error}`));
    };
    rec.onend = () => (alternatives.length ? resolve(alternatives) : reject(new RecognitionError(MESSAGES['no-speech'])));
  });
  rec.start();
  return { result, stop: () => rec.stop() };
}
