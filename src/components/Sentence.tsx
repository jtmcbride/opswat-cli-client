import { Text, type TextStyle } from 'react-native';

import { useTheme } from '@/constants/theme';
import type { DictIndex } from '@/lib/dictionary';
import { tokenize } from '@/lib/tokenize';

/**
 * Renders text word-by-word. Unknown words are underlined, the target word is highlighted, and
 * every word is tappable. `activeWord` (an index among the words) marks the word being spoken.
 */
export function Sentence({
  text,
  index,
  known,
  target,
  activeWord,
  onWordPress,
  style,
}: {
  text: string;
  index: DictIndex;
  known: Set<string>;
  target?: string;
  activeWord?: number;
  onWordPress?: (surface: string, lemmas: string[], wordIndex: number) => void;
  style?: TextStyle;
}) {
  const t = useTheme();
  let word = -1;
  return (
    <Text style={[{ color: t.text, fontSize: 24, lineHeight: 36 }, style]}>
      {tokenize(text).map((tok, i) => {
        if (!tok.isWord) return <Text key={i}>{tok.text}</Text>;
        const w = ++word;
        const lemmas = index.tokenLemmas(tok.norm);
        const isTarget = target !== undefined && lemmas.includes(target);
        const isUnknown = lemmas.some((l) => !known.has(l));
        const s: TextStyle = isTarget
          ? { backgroundColor: t.accentSoft, color: t.text, fontWeight: '700', borderRadius: 4 }
          : isUnknown
            ? { color: t.unknown, textDecorationLine: 'underline', textDecorationStyle: 'dotted' }
            : {};
        const active: TextStyle | null = w === activeWord ? { backgroundColor: t.primaryBorder, borderRadius: 4 } : null;
        return (
          <Text
            key={i}
            style={[s, active]}
            onPress={onWordPress ? () => onWordPress(tok.text, lemmas, w) : undefined}
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
