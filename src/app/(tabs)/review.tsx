import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SpeakButton } from '@/components/SpeakButton';
import { Button, Card, Empty, Row, Screen, T } from '@/components/ui';
import { radius, space, useTheme } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { speak } from '@/lib/speech';
import { isDue, previewInterval } from '@/lib/srs';
import type { Grade, KnownWord } from '@/lib/types';
import { useStore } from '@/store/useStore';

const GRADES: { grade: Grade; label: string }[] = [
  { grade: 'again', label: 'Again' },
  { grade: 'hard', label: 'Hard' },
  { grade: 'good', label: 'Good' },
  { grade: 'easy', label: 'Easy' },
];

function formatWhen(ms: number, now: number) {
  const mins = Math.round((ms - now) / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.round(hours / 24)} days`;
}

export default function ReviewScreen() {
  const t = useTheme();
  const lang = useStore((s) => s.settings.activeLang);
  const direction = useStore((s) => s.settings.reviewDirection);
  const allWords = useStore((s) => s.words);
  const gradeWord = useStore((s) => s.gradeWord);
  // Re-check periodically so "again" cards (due in ~1 min) come back during a session.
  const now = useNow(15000);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  const words = useMemo(() => allWords.filter((w) => w.lang === lang), [allWords, lang]);
  const due = useMemo(
    () => words.filter((w) => isDue(w.srs, now)).sort((a, b) => a.srs.due - b.srs.due),
    [words, now],
  );
  const card: KnownWord | undefined = due[0];
  // Stable per card so "mixed" mode doesn't flip when re-rendering.
  const showNativeFirst = useMemo(() => {
    if (!card) return false;
    if (direction === 'native') return true;
    if (direction === 'mixed') return (card.id.charCodeAt(card.id.length - 1) + card.srs.reps) % 2 === 0;
    return false;
  }, [card, direction]);

  // Optionally pronounce the word as soon as its side of the card is visible.
  const autoSpeak = useStore((s) => s.settings.autoSpeak);
  const speechRate = useStore((s) => s.settings.speechRate);
  const wordVisible = !!card && (!showNativeFirst || revealed);
  useEffect(() => {
    if (autoSpeak && wordVisible && card) void speak(card.word, card.lang, { id: `card:${card.id}`, rate: speechRate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSpeak, wordVisible, card?.id]);

  if (words.length === 0) {
    return (
      <Screen>
        <Empty icon="albums-outline" title="No cards yet" body="Add words you know and they'll show up here as flashcards.">
          <Button title="Add words" onPress={() => router.navigate('/')} />
        </Empty>
      </Screen>
    );
  }

  if (!card) {
    const next = words.reduce((a, b) => (a.srs.due < b.srs.due ? a : b));
    return (
      <Screen>
        <Empty
          icon="checkmark-circle-outline"
          title={reviewed > 0 ? `Done! ${reviewed} reviewed` : 'All caught up'}
          body={`Next card due in ${formatWhen(next.srs.due, now)}.`}>
          <Button title="Learn new words" icon="bulb" onPress={() => router.navigate('/learn')} />
        </Empty>
      </Screen>
    );
  }

  const front = showNativeFirst ? card.gloss || '(no meaning)' : card.word;
  const back = showNativeFirst ? card.word : card.gloss || '(no meaning)';

  const grade = (g: Grade) => {
    gradeWord(card.id, g);
    setRevealed(false);
    setReviewed((n) => n + 1);
  };

  return (
    <Screen>
      <T variant="muted">{due.length} due</T>
      <Pressable onPress={() => setRevealed(true)}>
        <Card style={styles.card}>
          <T variant="small">{showNativeFirst ? 'Meaning' : 'Word'}</T>
          <T variant="big">{front}</T>
          {!showNativeFirst && <SpeakButton text={card.word} lang={card.lang} size={28} id={`card:${card.id}`} />}
          {revealed ? (
            <>
              <View style={[styles.divider, { backgroundColor: t.border }]} />
              <T variant="big" style={{ fontSize: 24, fontWeight: '400' }}>
                {back}
              </T>
              {showNativeFirst && <SpeakButton text={card.word} lang={card.lang} size={28} id={`card:${card.id}`} />}
            </>
          ) : (
            <T variant="small" style={{ textAlign: 'center' }}>
              Tap to reveal
            </T>
          )}
        </Card>
      </Pressable>
      {revealed ? (
        <Row style={{ flexWrap: 'nowrap' }}>
          {GRADES.map(({ grade: g, label }) => (
            <Button
              key={g}
              compact
              variant={g === 'again' ? 'danger' : g === 'good' ? 'primary' : 'secondary'}
              title={`${label}\n${previewInterval(card.srs, g)}`}
              onPress={() => grade(g)}
              style={{ flex: 1, minHeight: 56 }}
            />
          ))}
        </Row>
      ) : (
        <Button title="Show answer" onPress={() => setRevealed(true)} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 260, justifyContent: 'center', alignItems: 'center', borderRadius: radius.lg, gap: space.lg },
  divider: { height: 1, alignSelf: 'stretch' },
});
