import type { DictionaryData } from '@/lib/types';

import { parseRawDictionary, type RawDictionary } from './format';
import de from './dictionaries/de';
import es from './dictionaries/es';
import fr from './dictionaries/fr';
import it from './dictionaries/it';
import pt from './dictionaries/pt';

const RAW: Record<string, RawDictionary> = { es, fr, de, it, pt };

export const BUILTIN_LANGUAGES = Object.values(RAW).map((r) => ({ code: r.lang, name: r.name }));

const cache = new Map<string, DictionaryData>();

export function builtinDictionary(lang: string): DictionaryData | undefined {
  const raw = RAW[lang];
  if (!raw) return undefined;
  let data = cache.get(lang);
  if (!data) {
    data = parseRawDictionary(raw);
    cache.set(lang, data);
  }
  return data;
}
