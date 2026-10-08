import * as DocumentPicker from 'expo-document-picker';
import { Platform, Share } from 'react-native';

import type { AudioInput } from '@/lib/transcribe';

/** Lets the user pick a text file and returns its contents, or null if cancelled. */
export async function pickTextFile(): Promise<{ name: string; text: string } | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['text/*', 'application/json', 'text/csv', 'text/tab-separated-values'],
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const asset = res.assets[0];
  const text = asset.file ? await asset.file.text() : await (await fetch(asset.uri)).text();
  return { name: asset.name, text };
}

/** Lets the user pick an audio file, or returns null if cancelled. */
export async function pickAudioFile(): Promise<AudioInput | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['audio/*', 'video/mp4'], copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  return { name: a.name, mimeType: a.mimeType ?? undefined, size: a.size ?? a.file?.size, blob: a.file ?? undefined, uri: a.uri };
}

/** Saves text as a download on web, or opens the share sheet on native. */
export async function shareText(filename: string, text: string) {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  await Share.share({ message: text, title: filename });
}
