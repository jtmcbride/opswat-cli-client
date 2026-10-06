import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { CoverageBar } from '@/components/CoverageBar';
import { glossFor, Sentence } from '@/components/Sentence';
import { SpeakButton } from '@/components/SpeakButton';
import { Button, Card, Row, Screen, T } from '@/components/ui';
import { radius, space, useTheme } from '@/constants/theme';
import { useApiKey } from '@/hooks/useApiKey';
import { useDictionary, useKnown } from '@/hooks/useDictionary';
import { glossInContext } from '@/lib/ai';
import { coverage, splitParagraphs, splitSentences } from '@/lib/reading';
import { normalize } from '@/lib/tokenize';
import { languageName, useStore } from '@/store/useStore';

interface Peek {
  surface: string;
  lemma: string;
  gloss?: string;
  sentence: string;
}

export default function ReaderScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const text = useStore((s) => s.texts.find((x) => x.id === id));
  const settings = useStore((s) => s.settings);
  const custom = useStore((s) => s.customLanguages);
  const addWord = useStore((s) => s.addWord);
  const addTextGlosses = useStore((s) => s.addTextGlosses);
  const removeText = useStore((s) => s.removeText);
  const lang = text?.lang ?? settings.activeLang;
  const { index } = useDictionary(lang);
  const { lemmas } = useKnown(lang, index);
  const [apiKey] = useApiKey();
  const [peek, setPeek] = useState<Peek | null>(null);
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paragraphs = useMemo(() => (text ? splitParagraphs(text.body).map(splitSentences) : []), [text]);
  const stats = useMemo(() => (text && index ? coverage(text.body, index, lemmas) : null), [text, index, lemmas]);

  if (!text) {
    return (
      <Screen>
        <T variant="muted">This text no longer exists.</T>
      </Screen>
    );
  }

  const glosses = text.glosses;
  const displayLemma = (lemma: string) => index?.get(lemma)?.lemma ?? lemma;
  const glossOf = (lemma: string) => glosses?.[lemma] ?? index?.get(lemma)?.gloss;

  const onWord = (surface: string, ls: string[], sentence: string) => {
    if (!index) return;
    setError(null);
    const lemma = ls.find((l) => !lemmas.has(l)) ?? ls[0];
    setPeek({
      surface,
      lemma: index.get(lemma)?.lemma ?? surface,
      gloss: glossFor(index, surface, ls, glosses),
      sentence: sentence.trim(),
    });
  };

  const lookUp = async () => {
    if (!peek || !apiKey) return;
    setLooking(true);
    setError(null);
    try {
      const r = await glossInContext({
        apiKey,
        model: settings.aiModel,
        language: languageName(lang, custom),
        nativeLanguage: settings.nativeLang,
        word: peek.surface,
        sentence: peek.sentence,
      });
      addTextGlosses(text.id, { [normalize(peek.surface)]: r.gloss, [normalize(r.lemma)]: r.gloss });
      setPeek({ ...peek, lemma: r.lemma, gloss: r.gloss });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLooking(false);
    }
  };

  const remove = () => {
    const doIt = () => {
      removeText(text.id);
      router.back();
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.('Delete this text?')) doIt();
    } else doIt();
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Stack.Screen options={{ title: text.title }} />
      <Screen edges={['bottom']}>
        <T variant="title">{text.title}</T>
        {stats && (
          <View style={{ gap: space.xs }}>
            <CoverageBar ratio={stats.ratio} />
            <T variant="small">
              {stats.total} words · {stats.unknown.length} new · tap any word for its meaning
            </T>
          </View>
        )}

        {index &&
          paragraphs.map((sentences, pi) => (
            <Row key={pi} style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
              <Text style={{ flex: 1, color: t.text, fontSize: 19, lineHeight: 30 }}>
                {sentences.map((s, si) => (
                  <Sentence
                    key={si}
                    text={s}
                    index={index}
                    known={lemmas}
                    style={{ fontSize: 19, lineHeight: 30 }}
                    onWordPress={(surface, ls) => onWord(surface, ls, s)}
                  />
                ))}
              </Text>
              <SpeakButton text={sentences.join('')} lang={lang} size={20} id={`para:${text.id}:${pi}`} />
            </Row>
          ))}

        {stats && stats.unknown.length > 0 && (
          <Card>
            <T variant="heading">New words in this text</T>
            {stats.unknown.slice(0, 40).map(({ lemma, count }) => {
              const gloss = glossOf(lemma);
              return (
                <Row key={lemma} style={{ flexWrap: 'nowrap' }}>
                  <View style={{ flex: 1 }}>
                    <T style={{ fontWeight: '600' }}>
                      {displayLemma(lemma)} <T variant="small">×{count}</T>
                    </T>
                    <T variant="muted" numberOfLines={1}>
                      {gloss ?? 'Tap the word in the text to look it up'}
                    </T>
                  </View>
                  {gloss && (
                    <Button compact variant="secondary" title="Add" onPress={() => addWord(lang, displayLemma(lemma), gloss)} />
                  )}
                </Row>
              );
            })}
          </Card>
        )}
        <Button variant="ghost" title="Delete text" onPress={remove} />
        {/* Room for the peek bar. */}
        {peek && <View style={{ height: 120 }} />}
      </Screen>

      {peek && (
        <Pressable onPress={() => setPeek(null)} style={[styles.peek, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Row style={{ flexWrap: 'nowrap' }}>
            <View style={{ flex: 1 }}>
              <T style={{ fontWeight: '600' }}>
                {peek.lemma}
                {normalize(peek.lemma) !== normalize(peek.surface) ? <T variant="small"> ({peek.surface})</T> : null}
              </T>
              <T variant="muted">{peek.gloss ?? 'Not in dictionary'}</T>
            </View>
            <SpeakButton text={peek.surface} lang={lang} size={20} />
            {peek.gloss ? (
              lemmas.has(index?.lemmaOf(peek.lemma) ?? '') ? (
                <T variant="small">Known</T>
              ) : (
                <Button
                  compact
                  title="Add"
                  icon="add"
                  onPress={() => {
                    addWord(lang, peek.lemma, peek.gloss ?? '', { text: peek.sentence, translation: '' });
                    setPeek(null);
                  }}
                />
              )
            ) : apiKey ? (
              <Button compact variant="secondary" title="Ask AI" icon="sparkles" loading={looking} onPress={lookUp} />
            ) : null}
          </Row>
          {error && <T style={{ color: t.danger }}>{error}</T>}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  peek: {
    position: 'absolute',
    left: space.sm,
    right: space.sm,
    bottom: space.lg,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: space.xs,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
