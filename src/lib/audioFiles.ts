import { File, Paths } from 'expo-file-system';

import type { AudioInput } from '@/lib/transcribe';

// Native: working files (downloads and upload chunks) live in the cache folder.

export async function readAudioBytes(audio: AudioInput): Promise<Uint8Array> {
  return new File(audio.uri).bytes();
}

/** A temporary file holding `bytes`, uploadable like any picked file. */
export async function audioChunk(bytes: Uint8Array, name: string): Promise<AudioInput> {
  const f = new File(Paths.cache, `${Date.now()}-${name}`);
  if (f.exists) f.delete();
  f.create();
  f.write(bytes);
  return { name, mimeType: 'audio/mpeg', size: bytes.length, uri: f.uri };
}

export function releaseChunk(chunk: AudioInput): void {
  try {
    const f = new File(chunk.uri);
    if (f.exists) f.delete();
  } catch {
    // Cache files are cleaned up by the system eventually.
  }
}

/** Downloads an audio file to the cache. Native downloads report no progress. */
export async function downloadAudio(url: string, name: string, onProgress?: (fraction: number | null) => void): Promise<AudioInput> {
  onProgress?.(null);
  const dest = new File(Paths.cache, `${Date.now()}-${name}`);
  const file = await File.downloadFileAsync(url, dest);
  return { name, mimeType: file.type || undefined, size: file.size, uri: file.uri };
}
