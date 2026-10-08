import { useEffect, useState } from 'react';

import { ANTHROPIC_KEY, getSecret, OPENAI_KEY, setSecret } from '@/lib/secrets';

/** A stored secret shared across screens. The hook's value is `undefined` while loading. */
function secretHook(name: string) {
  let current: string | null | undefined;
  const listeners = new Set<(v: string | null) => void>();

  return function useSecret() {
    const [key, setKey] = useState<string | null | undefined>(current);
    useEffect(() => {
      listeners.add(setKey);
      if (current === undefined) {
        getSecret(name).then((v) => {
          current = v;
          listeners.forEach((l) => l(v));
        });
      }
      return () => {
        listeners.delete(setKey);
      };
    }, []);

    const update = async (v: string | null) => {
      await setSecret(name, v);
      current = v;
      listeners.forEach((l) => l(v));
    };
    return [key, update] as const;
  };
}

/** The user's Anthropic API key. */
export const useApiKey = secretHook(ANTHROPIC_KEY);
/** The user's OpenAI API key, used only for audio transcription. */
export const useOpenAiKey = secretHook(OPENAI_KEY);
