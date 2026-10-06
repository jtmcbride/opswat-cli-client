import type { DictionaryData } from '@/lib/types';

import {
  mergeWithStarter,
  parseGenerated,
  parseRawDictionary,
  type GeneratedDictionary,
  type Inflections,
  type RawDictionary,
} from './format';
import de from './dictionaries/de';
import es from './dictionaries/es';
import fr from './dictionaries/fr';
import hr from './dictionaries/hr';
import it from './dictionaries/it';
import pt from './dictionaries/pt';

const RAW: Record<string, RawDictionary> = { es, fr, de, it, pt, hr };

// Large generated dictionaries are imported lazily so only the active language is loaded.
const GENERATED: Record<string, () => Promise<unknown>> = {
  es: () => import('./generated/es.json'),
  fr: () => import('./generated/fr.json'),
  de: () => import('./generated/de.json'),
  it: () => import('./generated/it.json'),
  pt: () => import('./generated/pt.json'),
  hr: () => import('./generated/hr.json'),
};

export const BUILTIN_LANGUAGES = Object.values(RAW).map((r) => ({ code: r.lang, name: r.name }));

const starterCache = new Map<string, DictionaryData>();

/** The small hand-written dictionary for a language (available synchronously). */
export function starterDictionary(lang: string): DictionaryData | undefined {
  const raw = RAW[lang];
  if (!raw) return undefined;
  let data = starterCache.get(lang);
  if (!data) {
    data = parseRawDictionary(raw);
    starterCache.set(lang, data);
  }
  return data;
}

const fullCache = new Map<string, Promise<DictionaryData | undefined>>();

/**
 * The full built-in dictionary: generated frequency-ranked entries and Tatoeba sentences, merged with
 * the hand-written starter set. Starter glosses win (they're curated) and starter-only words are
 * appended after the generated ones.
 */
export function loadBuiltinDictionary(lang: string): Promise<DictionaryData | undefined> {
  let p = fullCache.get(lang);
  if (!p) {
    p = (async () => {
      const starter = starterDictionary(lang);
      const mod = (await GENERATED[lang]?.().catch(() => null)) as { default?: GeneratedDictionary } | GeneratedDictionary | null;
      const gen = mod && 'default' in mod ? mod.default : (mod as GeneratedDictionary | null);
      if (!gen?.entries.length || !starter) return starter;
      const { entries, sentences } = parseGenerated(gen);
      return {
        ...starter,
        entries: mergeWithStarter(entries, starter.entries),
        sentences: [...starter.sentences, ...sentences],
        sources: gen.sources,
      };
    })();
    fullCache.set(lang, p);
  }
  return p;
}

const INFLECTIONS: Record<string, () => Promise<unknown>> = {
  es: () => import('./generated/es-forms.json'),
  fr: () => import('./generated/fr-forms.json'),
  de: () => import('./generated/de-forms.json'),
  it: () => import('./generated/it-forms.json'),
  pt: () => import('./generated/pt-forms.json'),
  hr: () => import('./generated/hr-forms.json'),
};
const inflectionCache = new Map<string, Promise<Inflections | null>>();

/** Inflection tables for a language, loaded on first use (only word pages need them). */
export function loadInflections(lang: string): Promise<Inflections | null> {
  let p = inflectionCache.get(lang);
  if (!p) {
    p = (async () => {
      const mod = (await INFLECTIONS[lang]?.().catch(() => null)) as { default?: Inflections } | Inflections | null;
      const data = mod && 'default' in mod ? mod.default : (mod as Inflections | null);
      return data && Object.keys(data.lemmas).length ? data : null;
    })();
    inflectionCache.set(lang, p);
  }
  return p;
}

/** One lemma's inflections as [form, tags]. Lookup is case-insensitive ("haus" finds "Haus"). */
export async function inflectionsFor(lang: string, lemma: string): Promise<[string, string[]][] | null> {
  const data = await loadInflections(lang);
  if (!data) return null;
  const key =
    lemma in data.lemmas ? lemma : Object.keys(data.lemmas).find((k) => k.toLocaleLowerCase() === lemma.toLocaleLowerCase());
  return key ? data.lemmas[key].map(([form, i]) => [form, data.tags[i].split(' ')]) : null;
}
