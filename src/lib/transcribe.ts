import { Platform } from 'react-native';

import type { AudioSegment, LangCode } from '@/lib/types';
import { alignWordStarts, wordsByLine, type TimedWord } from '@/lib/wordSync';

/** OpenAI's upload limit for the transcription endpoint. */
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

/** A picked audio file: a Blob on web, a local file URI on native. */
export interface AudioInput {
  name: string;
  mimeType?: string;
  size?: number;
  blob?: Blob;
  uri: string;
}

/** Transcribes audio with OpenAI Whisper, returning the text split into timed segments. */
export async function transcribeAudio({
  apiKey,
  audio,
  lang,
}: {
  apiKey: string;
  audio: AudioInput;
  lang: LangCode;
}): Promise<AudioSegment[]> {
  if (audio.size && audio.size > MAX_AUDIO_BYTES) {
    throw new Error(`This file is ${Math.round(audio.size / 1024 / 1024)} MB. The limit is 25 MB; try a shorter or lower-bitrate file.`);
  }
  const form = new FormData();
  if (Platform.OS === 'web') {
    form.append('file', audio.blob ?? (await (await fetch(audio.uri)).blob()), audio.name);
  } else {
    // React Native's FormData uploads local files from a { uri, name, type } descriptor.
    form.append('file', { uri: audio.uri, name: audio.name, type: audio.mimeType ?? 'audio/mpeg' } as unknown as Blob);
  }
  form.append('model', 'whisper-1');
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'segment');
  form.append('timestamp_granularities[]', 'word');
  // Whisper takes ISO-639-1 codes; let it auto-detect anything else (e.g. custom languages).
  const iso = lang.toLowerCase().split(/[-_]/)[0];
  if (/^[a-z]{2}$/.test(iso)) form.append('language', iso);

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error?.message ?? `Transcription failed (HTTP ${res.status}).`);
  return parseSegments(body);
}

/** Pulls clean, non-empty segments (with word timings when present) out of a verbose_json response. */
export function parseSegments(body: unknown): AudioSegment[] {
  const b = body as {
    text?: string;
    duration?: number;
    segments?: { start: number; end: number; text: string }[];
    words?: TimedWord[];
  } | null;
  let segments: AudioSegment[] = (b?.segments ?? [])
    .map((s) => ({ start: s.start, end: s.end, text: s.text.trim() }))
    .filter((s) => s.text);
  if (!segments.length) {
    const text = b?.text?.trim();
    if (!text) throw new Error('No speech was found in this audio.');
    segments = [{ start: 0, end: b?.duration ?? b?.words?.at(-1)?.end ?? 0, text }];
  }
  if (b?.words?.length) {
    const grouped = wordsByLine(segments, b.words);
    segments = segments.map((s, i) => ({ ...s, wordStarts: alignWordStarts(s.text, grouped[i], s.start, s.end) }));
  }
  return segments;
}
