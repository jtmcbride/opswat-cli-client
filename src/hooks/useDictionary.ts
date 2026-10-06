import { useEffect, useMemo, useState } from 'react';

import { builtinDictionary } from '@/data';
import { DictIndex } from '@/lib/dictionary';
import { knownLemmaSet } from '@/lib/picker';
import type { LangCode, SentencePair } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { loadDictEntries } from '@/store/userDicts';

const indexCache = new Map<string, DictIndex>();
const EMPTY: SentencePair[] = [];

/** Built-in + enabled user dictionaries for a language, merged into one index. */
export function useDictionary(lang: LangCode) {
  const userDicts = useStore((s) => s.userDicts);
  const extra = useStore((s) => s.extraSentences[lang] ?? EMPTY);
  const enabledIds = userDicts.filter((d) => d.lang === lang && d.enabled).map((d) => d.id);
  const key = `${lang}:${enabledIds.join(',')}`;
  // Bumped when an async load finishes so the component re-reads the cache.
  const [, setLoaded] = useState(0);
  const index = indexCache.get(key) ?? null;

  useEffect(() => {
    if (indexCache.has(key)) return;
    let cancelled = false;
    (async () => {
      const builtin = builtinDictionary(lang)?.entries ?? [];
      const user = await Promise.all(enabledIds.map(loadDictEntries));
      indexCache.set(key, new DictIndex([builtin, ...user]));
      if (!cancelled) setLoaded((n) => n + 1);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const sentences = useMemo(() => [...(builtinDictionary(lang)?.sentences ?? []), ...extra], [lang, extra]);
  return { index, sentences };
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
