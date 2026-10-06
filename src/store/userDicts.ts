import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DictEntry } from '@/lib/types';

// Imported dictionaries can be large, so their entries live under their own keys rather than in
// the main app state.
const key = (id: string) => `lingo.dict.${id}`;
const cache = new Map<string, DictEntry[]>();

export async function saveDictEntries(id: string, entries: DictEntry[]) {
  cache.set(id, entries);
  await AsyncStorage.setItem(key(id), JSON.stringify(entries));
}

export async function loadDictEntries(id: string): Promise<DictEntry[]> {
  const hit = cache.get(id);
  if (hit) return hit;
  const raw = await AsyncStorage.getItem(key(id));
  const entries: DictEntry[] = raw ? JSON.parse(raw) : [];
  cache.set(id, entries);
  return entries;
}

export async function deleteDictEntries(id: string) {
  cache.delete(id);
  await AsyncStorage.removeItem(key(id));
}
