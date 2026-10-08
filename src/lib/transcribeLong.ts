import { audioChunk, readAudioBytes, releaseChunk } from '@/lib/audioFiles';
import { splitMp3 } from '@/lib/mp3';
import { MAX_AUDIO_BYTES, transcribeAudio, type AudioInput } from '@/lib/transcribe';
import type { AudioSegment, LangCode } from '@/lib/types';

/** Chunk size for long uploads, under the 25 MB limit with room for the multipart envelope. */
const CHUNK_BYTES = 24 * 1024 * 1024;
/** Largest file read into memory for splitting (several hours of typical podcast audio). */
export const MAX_EPISODE_BYTES = 250 * 1024 * 1024;

/**
 * Transcribes audio of any length: small files go up in one request; longer MP3s are split at frame
 * boundaries, transcribed part by part, and stitched back together on one timeline.
 */
export async function transcribeLong({
  apiKey,
  audio,
  lang,
  onProgress,
}: {
  apiKey: string;
  audio: AudioInput;
  lang: LangCode;
  onProgress?: (message: string) => void;
}): Promise<AudioSegment[]> {
  if (!audio.size || audio.size <= MAX_AUDIO_BYTES) {
    onProgress?.('Transcribing…');
    return transcribeAudio({ apiKey, audio, lang });
  }
  if (audio.size > MAX_EPISODE_BYTES) {
    throw new Error(`This file is ${Math.round(audio.size / 1024 / 1024)} MB; the limit is ${MAX_EPISODE_BYTES / 1024 / 1024} MB.`);
  }

  onProgress?.('Preparing audio…');
  const bytes = await readAudioBytes(audio);
  const split = splitMp3(bytes, CHUNK_BYTES);
  if (!split) throw new Error('Files over 25 MB can only be transcribed if they are MP3.');

  const base = audio.name.replace(/\.[^.]+$/, '');
  const n = split.chunks.length;
  const segments: AudioSegment[] = [];
  for (const [i, c] of split.chunks.entries()) {
    onProgress?.(`Transcribing part ${i + 1} of ${n}…`);
    const chunk = await audioChunk(bytes.subarray(c.start, c.end), `${base}-part${i + 1}.mp3`);
    try {
      const part = await transcribeAudio({ apiKey, audio: chunk, lang });
      segments.push(...part.map((s) => ({ ...s, start: s.start + c.startTime, end: s.end + c.startTime })));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      // A silent stretch (music, an ad break) shouldn't fail the whole episode.
      if (!message.startsWith('No speech')) throw new Error(`Part ${i + 1} of ${n}: ${message}`);
    } finally {
      releaseChunk(chunk);
    }
  }
  if (!segments.length) throw new Error('No speech was found in this audio.');
  return segments;
}
