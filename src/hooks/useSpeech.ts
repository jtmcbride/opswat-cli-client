import { useEffect, useState, useSyncExternalStore } from 'react';

import { canSpeak, currentSpeakingId, subscribeSpeaking } from '@/lib/speech';
import type { LangCode } from '@/lib/types';

/** Whether to offer speech for a language. True while unknown so buttons don't flicker in. */
export function useCanSpeak(lang: LangCode) {
  const [result, setResult] = useState<{ lang: LangCode; ok: boolean } | null>(null);
  useEffect(() => {
    let cancelled = false;
    canSpeak(lang).then((ok) => {
      if (!cancelled) setResult({ lang, ok: ok !== false });
    });
    return () => {
      cancelled = true;
    };
  }, [lang]);
  return result?.lang === lang ? result.ok : true;
}

export function useSpeakingId() {
  return useSyncExternalStore(subscribeSpeaking, currentSpeakingId, currentSpeakingId);
}
