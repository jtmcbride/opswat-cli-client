import { useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { Button, T } from '@/components/ui';
import { space, useTheme } from '@/constants/theme';
import { matchSpeech, type SpeechMatch } from '@/lib/pronunciation';
import { listen, recognitionSupported } from '@/lib/recognition';
import { stopSpeaking } from '@/lib/speech';
import type { LangCode } from '@/lib/types';
import { useStore } from '@/store/useStore';

/** "Say it": records the learner and shows which words of `target` were recognised. */
export function SayIt({ target, lang, compact }: { target: string; lang: LangCode; compact?: boolean }) {
  const t = useTheme();
  const enabled = useStore((s) => s.settings.speaking);
  const [state, setState] = useState<'idle' | 'listening'>('idle');
  const [match, setMatch] = useState<SpeechMatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef<() => void>(() => {});
  if (!recognitionSupported || !enabled) return null;

  const start = async () => {
    setError(null);
    setMatch(null);
    await stopSpeaking();
    const { result, stop } = listen(lang);
    stopRef.current = stop;
    setState('listening');
    try {
      setMatch(matchSpeech(target, await result));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setState('idle');
    }
  };

  const verdict = match ? (match.score >= 0.9 ? 'Great!' : match.score >= 0.6 ? 'Close' : 'Try again') : null;
  const verdictColor = match ? (match.score >= 0.9 ? t.success : match.score >= 0.6 ? t.accent : t.danger) : t.text;

  return (
    <View style={{ gap: space.xs }}>
      <Button
        compact
        variant={state === 'listening' ? 'danger' : compact ? 'ghost' : 'secondary'}
        icon={state === 'listening' ? 'stop' : 'mic-outline'}
        title={state === 'listening' ? 'Listening… tap to stop' : match ? 'Say it again' : 'Say it'}
        onPress={() => (state === 'listening' ? stopRef.current() : start())}
      />
      {match && (
        <View style={{ gap: 2 }}>
          <T style={{ color: verdictColor, fontWeight: '700' }}>
            {verdict} {Math.round(match.score * 100)}%
          </T>
          {match.words.length > 1 && (
            <Text style={{ fontSize: 16, lineHeight: 24 }}>
              {match.words.map((w, i) => (
                <Text
                  key={i}
                  style={{ color: w.heard ? t.success : t.danger, textDecorationLine: w.heard ? 'none' : 'underline' }}>
                  {w.text}
                  {i < match.words.length - 1 ? ' ' : ''}
                </Text>
              ))}
            </Text>
          )}
          <T variant="small">Heard: “{match.transcript}”</T>
        </View>
      )}
      {error && <T style={{ color: t.danger }}>{error}</T>}
    </View>
  );
}
