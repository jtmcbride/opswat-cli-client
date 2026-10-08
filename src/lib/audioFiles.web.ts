import { fetchMedia } from '@/lib/media';
import type { AudioInput } from '@/lib/transcribe';

// Web: audio is handled as in-memory Blobs.

export async function readAudioBytes(audio: AudioInput): Promise<Uint8Array> {
  const blob = audio.blob ?? (await (await fetch(audio.uri)).blob());
  return new Uint8Array(await blob.arrayBuffer());
}

export async function audioChunk(bytes: Uint8Array, name: string): Promise<AudioInput> {
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'audio/mpeg' });
  return { name, mimeType: 'audio/mpeg', size: blob.size, blob, uri: '' };
}

export function releaseChunk(chunk: AudioInput): void {
  void chunk;
}

/** Downloads an audio file into memory, reporting progress when the size is known. */
export async function downloadAudio(url: string, name: string, onProgress?: (fraction: number | null) => void): Promise<AudioInput> {
  const res = await fetchMedia(url);
  const total = Number(res.headers.get('content-length')) || 0;
  const type = res.headers.get('content-type') ?? undefined;
  if (!res.body) {
    const blob = await res.blob();
    return { name, mimeType: type, size: blob.size, blob, uri: url };
  }
  const reader = res.body.getReader();
  const parts: Uint8Array[] = [];
  let received = 0;
  onProgress?.(total ? 0 : null);
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    received += value.length;
    if (total) onProgress?.(Math.min(1, received / total));
  }
  const blob = new Blob(parts as Uint8Array<ArrayBuffer>[], { type });
  return { name, mimeType: type, size: blob.size, blob, uri: url };
}
