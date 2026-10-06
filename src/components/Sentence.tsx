import { Text, type TextStyle } from 'react-native';

import { useTheme } from '@/constants/theme';
import type { DictIndex } from '@/lib/dictionary';
import { tokenize } from '@/lib/tokenize';

/**
 * Renders text word-by-word. Unknown words are underlined, the target word is highlighted, and
 * every word is tappable.
 */
export function Sentence({
  text,
  index,
  known,
  target,
  onWordPress,
  style,
}: {
  text: string;
  index: DictIndex;
  known: Set<string>;
  target?: string;
  onWordPress?: (surface: string, lemmas: string[]) => void;
  style?: TextStyle;
}) {
  const t = useTheme();
  return (
    <Text style={[{ color: t.text, fontSize: 24, lineHeight: 36 }, style]}>
      {tokenize(text).map((tok, i) => {
        if (!tok.isWord) return <Text key={i}>{tok.text}</Text>;
        const lemmas = index.tokenLemmas(tok.norm);
        const isTarget = target !== undefined && lemmas.includes(target);
        const isUnknown = lemmas.some((l) => !known.has(l));
        const s: TextStyle = isTarget
          ? { backgroundColor: t.accentSoft, color: t.text, fontWeight: '700', borderRadius: 4 }
          : isUnknown
            ? { color: t.unknown, textDecorationLine: 'underline', textDecorationStyle: 'dotted' }
            : {};
        return (
          <Text
            key={i}
            style={s}
            onPress={onWordPress ? () => onWordPress(tok.text, lemmas) : undefined}
            suppressHighlighting>
            {tok.text}
          </Text>
        );
      })}
    </Text>
  );
}

/** Best available gloss for a word: per-sentence glosses first, then the dictionary. */
export function glossFor(index: DictIndex, surface: string, lemmas: string[], extra?: Record<string, string>) {
  const norm = surface.toLocaleLowerCase();
  if (extra?.[norm]) return extra[norm];
  const parts = lemmas.map((l) => extra?.[l] ?? index.get(l)?.gloss).filter(Boolean);
  return parts.length ? parts.join(' + ') : undefined;
}
