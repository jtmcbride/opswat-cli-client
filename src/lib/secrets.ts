import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const ANTHROPIC_KEY = 'lingo.anthropicApiKey';
export const OPENAI_KEY = 'lingo.openaiApiKey';

// SecureStore is native-only; on web keys live in this browser's localStorage.
export async function getSecret(name: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(name) ?? null;
    return await SecureStore.getItemAsync(name);
  } catch {
    return null;
  }
}

export async function setSecret(name: string, value: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (value) globalThis.localStorage?.setItem(name, value);
    else globalThis.localStorage?.removeItem(name);
    return;
  }
  if (value) await SecureStore.setItemAsync(name, value);
  else await SecureStore.deleteItemAsync(name);
}
