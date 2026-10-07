import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text } from 'react-native';

import { useTheme } from '@/constants/theme';
import { useCanSpeak, useSpeakingId } from '@/hooks/useSpeech';
import { speak, stopSpeaking, type SpeechRate } from '@/lib/speech';
import type { LangCode } from '@/lib/types';
import { useStore } from '@/store/useStore';

/**
 * Plays `text` with the device's voice for `lang`. Tap to play (tap again to stop), long-press for
 * slow speech. Renders nothing when the device has no voice for the language.
 */
export function SpeakButton({
  text,
  lang,
  size = 22,
  rate,
  id,
}: {
  text: string;
  lang: LangCode;
  size?: number;
  /** Overrides the user's default rate. */
  rate?: SpeechRate;
  id?: string;
}) {
  const t = useTheme();
  const defaultRate = useStore((s) => s.settings.speechRate);
  const available = useCanSpeak(lang);
  const speakingId = useSpeakingId();
  const key = id ?? `${rate ?? ''}:${text}`;
  const active = speakingId === key;
  if (!available) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rate === 'slow' ? 'Play slowly' : 'Play pronunciation'}
      hitSlop={10}
      onPress={() => (active ? stopSpeaking() : speak(text, lang, { id: key, rate: rate ?? defaultRate }))}
      onLongPress={() => speak(text, lang, { id: key, rate: 'slow' })}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, minWidth: 44, minHeight: 44, justifyContent: 'center', padding: 4, flexDirection: 'row', alignItems: 'center', gap: 2 })}>
      <Ionicons accessible={false} aria-hidden name={active ? 'volume-high' : 'volume-medium-outline'} size={size} color={active ? t.primary : t.textMuted} />
      {rate === 'slow' && <Text style={{ color: active ? t.primary : t.textMuted, fontSize: 13 }}>slow</Text>}
    </Pressable>
  );
}
