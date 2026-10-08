import { Directory, File, Paths } from 'expo-file-system';

import type { AudioInput } from '@/lib/transcribe';

// Native: imported audio is copied into the app's documents folder, one file per text.
const dir = () => new Directory(Paths.document, 'audio');
const fileFor = (id: string) => new File(dir(), id);

export async function saveAudio(id: string, audio: AudioInput): Promise<void> {
  const d = dir();
  if (!d.exists) d.create({ intermediates: true, idempotent: true });
  const dest = fileFor(id);
  if (dest.exists) dest.delete();
  await new File(audio.uri).copy(dest);
}

/** A playable URI for the text's audio, or null when it isn't on this device. */
export async function getAudioUri(id: string): Promise<string | null> {
  const f = fileFor(id);
  return f.exists ? f.uri : null;
}

export function releaseAudioUri(uri: string): void {
  // Native URIs point at permanent files; nothing to release.
  void uri;
}

export async function deleteAudio(id: string): Promise<void> {
  try {
    const f = fileFor(id);
    if (f.exists) f.delete();
  } catch {
    // Already gone.
  }
}
