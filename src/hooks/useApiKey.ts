import { useEffect, useState } from 'react';

import { getApiKey, setApiKey } from '@/lib/secrets';

let current: string | null | undefined;
const listeners = new Set<(v: string | null) => void>();

/** The user's Anthropic API key, shared across screens. `undefined` while loading. */
export function useApiKey() {
  const [key, setKey] = useState<string | null | undefined>(current);
  useEffect(() => {
    listeners.add(setKey);
    if (current === undefined) {
      getApiKey().then((v) => {
        current = v;
        listeners.forEach((l) => l(v));
      });
    }
    return () => {
      listeners.delete(setKey);
    };
  }, []);

  const update = async (v: string | null) => {
    await setApiKey(v);
    current = v;
    listeners.forEach((l) => l(v));
  };
  return [key, update] as const;
}
