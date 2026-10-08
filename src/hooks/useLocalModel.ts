import { useCallback, useEffect, useState } from 'react';

import { isModelDownloaded, localSupport, recommendedModel, type LocalModel, type LocalSupport } from '@/lib/localTranscribe';
import { useStore } from '@/store/useStore';

/** On-device transcription status for this browser/device: support, the model in use, and whether it's downloaded. */
export function useLocalModel() {
  const chosen = useStore((s) => s.settings.localModel);
  const [support, setSupport] = useState<LocalSupport | null>(null);
  const [recommended, setRecommended] = useState<LocalModel>('fast');
  const [downloaded, setDownloaded] = useState<Record<LocalModel, boolean>>({ fast: false, accurate: false });

  const refresh = useCallback(async () => {
    const [fast, accurate] = await Promise.all([isModelDownloaded('fast'), isModelDownloaded('accurate')]);
    setDownloaded({ fast, accurate });
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      const [s, r] = await Promise.all([localSupport(), recommendedModel()]);
      if (!live) return;
      setSupport(s);
      setRecommended(r);
      await refresh();
    })();
    return () => {
      live = false;
    };
  }, [refresh]);

  return { support, recommended, model: chosen ?? recommended, downloaded, refresh };
}
