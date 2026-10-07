import { useState } from 'react';
import { View } from 'react-native';

import { Button, T } from '@/components/ui';
import { space, useTheme } from '@/constants/theme';
import { useApiKey } from '@/hooks/useApiKey';
import { explainSentence } from '@/lib/ai';
import { languageName, useStore } from '@/store/useStore';

// Explanations are cached for the session so revisiting a sentence doesn't cost another request.
const cache = new Map<string, string>();

/** "Explain grammar" for a sentence, via the AI tutor. Renders nothing without an API key. */
export function ExplainButton({ sentence, translation, focus }: { sentence: string; translation?: string; focus?: string }) {
  const t = useTheme();
  const [apiKey] = useApiKey();
  const settings = useStore((s) => s.settings);
  const custom = useStore((s) => s.customLanguages);
  const key = `${settings.activeLang}|${sentence}|${focus ?? ''}`;
  const [text, setText] = useState<string | null>(() => cache.get(key) ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!apiKey) return null;

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const out = await explainSentence({
        apiKey,
        model: settings.aiModel,
        language: languageName(settings.activeLang, custom),
        nativeLanguage: settings.nativeLang,
        sentence,
        translation,
        focus,
      });
      cache.set(key, out);
      setText(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (text) {
    return (
      <View style={{ gap: space.xs, padding: space.md, borderRadius: 12, backgroundColor: t.surfaceAlt }}>
        <T variant="small">Grammar</T>
        <T>{text}</T>
      </View>
    );
  }
  return (
    <View style={{ gap: space.xs }}>
      <Button compact variant="ghost" icon="school-outline" title="Explain grammar" loading={busy} onPress={run} />
      {error && <T style={{ color: t.danger }}>{error}</T>}
    </View>
  );
}
