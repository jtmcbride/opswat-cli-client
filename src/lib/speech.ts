import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

import type { LangCode } from './types';
import { localeFor, pickVoice, type VoiceInfo } from './voices';

export type SpeechRate = 'normal' | 'slow';
const RATES: Record<SpeechRate, number> = { normal: 0.95, slow: 0.6 };

/** True when this platform can synthesize speech at all. */
export const speechSupported = Platform.OS !== 'web' || (typeof window !== 'undefined' && 'speechSynthesis' in window);

let voicesPromise: Promise<VoiceInfo[]> | null = null;

/**
 * Installed voices, loaded once. Times out because browsers without voices never fire
 * `voiceschanged`, which would otherwise leave the promise pending forever.
 */
export function loadVoices(): Promise<VoiceInfo[]> {
  if (!speechSupported) return Promise.resolve([]);
  voicesPromise ??= Promise.race([
    Speech.getAvailableVoicesAsync().catch(() => []),
    new Promise<VoiceInfo[]>((resolve) => setTimeout(() => resolve([]), 3000)),
  ]);
  return voicesPromise;
}

/**
 * Whether a language can be spoken. `undefined` when the device doesn't list its voices; in that
 * case speaking is still attempted with the language tag and the system picks a voice.
 */
export async function canSpeak(lang: LangCode): Promise<boolean | undefined> {
  if (!speechSupported) return false;
  const voices = await loadVoices();
  if (!voices.length) return undefined;
  return pickVoice(voices, lang) !== null;
}

// The id of whatever is being spoken, so buttons can show state. Only one utterance plays at a time.
let speakingId: string | null = null;
const listeners = new Set<(id: string | null) => void>();
const setSpeaking = (id: string | null) => {
  speakingId = id;
  listeners.forEach((l) => l(id));
};

export function subscribeSpeaking(listener: (id: string | null) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const currentSpeakingId = () => speakingId;

export async function speak(text: string, lang: LangCode, opts: { id?: string; rate?: SpeechRate } = {}) {
  if (!speechSupported || !text.trim()) return;
  const id = opts.id ?? text;
  await Speech.stop();
  const voice = pickVoice(await loadVoices(), lang);
  const done = () => {
    if (speakingId === id) setSpeaking(null);
  };
  setSpeaking(id);
  Speech.speak(text.slice(0, Speech.maxSpeechInputLength), {
    language: voice?.language ?? localeFor(lang),
    voice: voice?.identifier,
    rate: RATES[opts.rate ?? 'normal'],
    onDone: done,
    onStopped: done,
    onError: done,
  });
}

export async function stopSpeaking() {
  await Speech.stop();
  setSpeaking(null);
}
