import { useEffect, useMemo, useState } from 'react';

import { loadBuiltinDictionary, loadInflections } from '@/data';
import { DictIndex } from '@/lib/dictionary';
import { knownLemmaSet } from '@/lib/picker';
import type { LangCode, SentencePair } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { loadDictEntries } from '@/store/userDicts';

interface Loaded {
  index: DictIndex;
  sentences: SentencePair[];
  sources: string[];
}

const cache = new Map<string, Loaded>();
const EMPTY: SentencePair[] = [];

/** Built-in + enabled user dictionaries for a language, merged into one index. */
export function useDictionary(lang: LangCode) {
  const userDicts = useStore((s) => s.userDicts);
  const extra = useStore((s) => s.extraSentences[lang] ?? EMPTY);
  const enabledIds = userDicts.filter((d) => d.lang === lang && d.enabled).map((d) => d.id);
  const key = `${lang}:${enabledIds.join(',')}`;
  // Bumped when an async load finishes so the component re-reads the cache.
  const [, setLoaded] = useState(0);
  const loaded = cache.get(key);

  useEffect(() => {
    if (cache.has(key)) return;
    let cancelled = false;
    (async () => {
      const builtin = await loadBuiltinDictionary(lang);
      const user = await Promise.all(enabledIds.map(loadDictEntries));
      const loaded: Loaded = {
        index: new DictIndex([builtin?.entries ?? [], ...user]),
        sentences: builtin?.sentences ?? EMPTY,
        sources: builtin?.sources ?? [],
      };
      cache.set(key, loaded);
      if (!cancelled) setLoaded((n) => n + 1);
      // Then, in the background, every conjugated/declined form from the full tables.
      const tables = await loadInflections(lang);
      if (!tables || cache.get(key) !== loaded) return;
      const forms = Object.entries(tables.lemmas).map(([lemma, list]) => [lemma, list.map(([f]) => f)] as [string, string[]]);
      cache.set(key, { ...loaded, index: loaded.index.withTableForms(forms) });
      if (!cancelled) setLoaded((n) => n + 1);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const base = loaded?.sentences ?? EMPTY;
  const sentences = useMemo(() => (extra.length ? [...base, ...extra] : base), [base, extra]);
  return { index: loaded?.index ?? null, sentences, sources: loaded?.sources ?? [] };
}

/** Known words for a language plus the derived lemma set used for sentence matching. */
export function useKnown(lang: LangCode, index: DictIndex | null) {
  const allWords = useStore((s) => s.words);
  const words = useMemo(() => allWords.filter((w) => w.lang === lang), [allWords, lang]);
  const lemmas = useMemo(
    () => (index ? knownLemmaSet(words.map((w) => w.word), index) : new Set<string>()),
    [words, index],
  );
  return { words, lemmas };
}
