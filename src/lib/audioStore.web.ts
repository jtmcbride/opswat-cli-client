import type { AudioInput } from '@/lib/transcribe';

// Web: imported audio is kept in IndexedDB as a Blob, one record per text.
const DB = 'lingo-audio';
const STORE = 'files';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function saveAudio(id: string, audio: AudioInput): Promise<void> {
  const blob = audio.blob ?? (await (await fetch(audio.uri)).blob());
  await run('readwrite', (s) => s.put(blob, id));
}

/** A playable object URL for the text's audio, or null when it isn't on this device. Release it when done. */
export async function getAudioUri(id: string): Promise<string | null> {
  try {
    const blob = await run<Blob | undefined>('readonly', (s) => s.get(id));
    return blob ? URL.createObjectURL(blob) : null;
  } catch {
    return null;
  }
}

export function releaseAudioUri(uri: string): void {
  URL.revokeObjectURL(uri);
}

export async function deleteAudio(id: string): Promise<void> {
  try {
    await run('readwrite', (s) => s.delete(id));
  } catch {
    // Already gone.
  }
}
