import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ExplainButton } from '@/components/ExplainButton';
import { SpeakButton } from '@/components/SpeakButton';
import { Button, Card, Empty, Input, Row, Screen, T } from '@/components/ui';
import { radius, space, useTheme } from '@/constants/theme';
import { useDictionary, useKnown } from '@/hooks/useDictionary';
import { useNow } from '@/hooks/useNow';
import { useCanSpeak } from '@/hooks/useSpeech';
import {
  checkAnswer,
  chooseExercise,
  findContext,
  SUGGESTED_GRADE,
  type AnswerResult,
  type Cloze,
  type ExerciseKind,
} from '@/lib/recall';
import { speak, speechSupported } from '@/lib/speech';
import { buildQueue } from '@/lib/queue';
import { isLeech, isNew, previewInterval } from '@/lib/srs';
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
  const days = Math.round(hours / 24);
  return days === 1 ? '1 day' : `${days} days`;
}

export default function ReviewScreen() {
  const lang = useStore((s) => s.settings.activeLang);
  const settings = useStore((s) => s.settings);
  const allWords = useStore((s) => s.words);
  const gradeWord = useStore((s) => s.gradeWord);
  const { index, sentences } = useDictionary(lang);
  const { lemmas } = useKnown(lang, index);
  const voiceAvailable = useCanSpeak(lang);
  // Re-check periodically so "again" cards (due in ~1 min) come back during a session.
  const now = useNow(15000);
  const [reviewed, setReviewed] = useState(0);

  const words = useMemo(() => allWords.filter((w) => w.lang === lang), [allWords, lang]);
  const queue = useMemo(() => buildQueue(words, now, settings.dailyNewLimit), [words, now, settings.dailyNewLimit]);
  const card: KnownWord | undefined = queue.cards[0];

  const context = useMemo(
    () => (card && index && settings.reviewStyle === 'mixed' ? findContext(card, index, sentences, lemmas) : null),
    // Only recompute when the card changes, not on every known-word change mid-review.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [card?.id, card?.srs.reps, index, sentences, settings.reviewStyle],
  );
  const kind: ExerciseKind | null = card
    ? chooseExercise(card, {
        style: settings.reviewStyle,
        hasContext: !!context,
        canListen: settings.listening && speechSupported && voiceAvailable,
      })
    : null;

  if (words.length === 0) {
    return (
      <Screen>
        <Empty icon="albums-outline" title="No cards yet" body="Add words you know and they'll show up here as flashcards.">
          <Button title="Add words" onPress={() => router.navigate('/')} />
        </Empty>
      </Screen>
    );
  }

  if (!card || !kind) {
    const scheduled = words.filter((w) => !w.suspended && !isNew(w.srs));
    const next = scheduled.length ? scheduled.reduce((a, b) => (a.srs.due < b.srs.due ? a : b)) : null;
    const waitingNew = words.filter((w) => !w.suspended && isNew(w.srs)).length;
    const body = [
      next ? `Next review in ${formatWhen(next.srs.due, now)}.` : null,
      waitingNew && queue.newRemaining === 0
        ? `${waitingNew} new ${waitingNew === 1 ? 'word is' : 'words are'} waiting: you've reached today's limit of ${settings.dailyNewLimit} new words (change it in Settings).`
        : null,
    ]
      .filter(Boolean)
      .join(' ');
    return (
      <Screen>
        <Empty
          icon="checkmark-circle-outline"
          title={reviewed > 0 ? `Done! ${reviewed} reviewed` : 'All caught up'}
          body={body || undefined}>
          <Button title="Learn new words" icon="bulb" onPress={() => router.navigate('/learn')} />
        </Empty>
      </Screen>
    );
  }

  const grade = (g: Grade) => {
    gradeWord(card.id, g);
    setReviewed((n) => n + 1);
  };

  return (
    <Screen>
      <T variant="muted">
        {queue.reviews} to review · {queue.newCards} new
      </T>
      {isLeech(card.srs) && <LeechNotice card={card} />}
      {kind === 'flip' ? (
        <FlipCard key={`${card.id}:${card.srs.reps}`} card={card} onGrade={grade} />
      ) : (
        <RecallCard key={`${card.id}:${card.srs.reps}`} card={card} kind={kind} cloze={context} onGrade={grade} />
      )}
    </Screen>
  );
}

/** Shown on words forgotten many times: drilling them again rarely helps. */
function LeechNotice({ card }: { card: KnownWord }) {
  const t = useTheme();
  const updateWord = useStore((s) => s.updateWord);
  return (
    <Card style={{ backgroundColor: t.accentSoft, borderColor: t.accent }}>
      <T style={{ fontWeight: '600' }}>You&apos;ve forgotten this word {card.srs.lapses} times.</T>
      <T variant="muted">Try adding a memory hook to its meaning, or set it aside for now.</T>
      <Row>
        <Button compact variant="secondary" title="Edit word" onPress={() => router.push({ pathname: '/word/[id]', params: { id: card.id } })} />
        <Button compact variant="ghost" title="Suspend" onPress={() => updateWord(card.id, { suspended: true })} />
      </Row>
    </Card>
  );
}

function GradeButtons({ card, onGrade, suggested }: { card: KnownWord; onGrade: (g: Grade) => void; suggested?: Grade }) {
  const retention = useStore((s) => s.settings.retention);
  return (
    <Row style={{ flexWrap: 'nowrap' }}>
      {GRADES.map(({ grade: g, label }) => (
        <Button
          key={g}
          compact
          variant={suggested ? (g === suggested ? 'primary' : 'secondary') : g === 'again' ? 'danger' : g === 'good' ? 'primary' : 'secondary'}
          title={`${label}\n${previewInterval(card.srs, g, undefined, { retention })}`}
          onPress={() => onGrade(g)}
          style={{ flex: 1, minHeight: 56 }}
        />
      ))}
    </Row>
  );
}

/** Recognition: see the word (or meaning), reveal, grade yourself. */
function FlipCard({ card, onGrade }: { card: KnownWord; onGrade: (g: Grade) => void }) {
  const t = useTheme();
  const direction = useStore((s) => s.settings.reviewDirection);
  const autoSpeak = useStore((s) => s.settings.autoSpeak);
  const speechRate = useStore((s) => s.settings.speechRate);
  const [revealed, setRevealed] = useState(false);
  // Stable per card so "mixed" mode doesn't flip when re-rendering.
  const showNativeFirst =
    direction === 'native' ||
    (direction === 'mixed' && (card.id.charCodeAt(card.id.length - 1) + card.srs.reps) % 2 === 0);
  const wordVisible = !showNativeFirst || revealed;

  useEffect(() => {
    if (autoSpeak && wordVisible) void speak(card.word, card.lang, { id: `card:${card.id}`, rate: speechRate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSpeak, wordVisible]);

  const front = showNativeFirst ? card.gloss || '(no meaning)' : card.word;
  const back = showNativeFirst ? card.word : card.gloss || '(no meaning)';

  return (
    <>
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
        <GradeButtons card={card} onGrade={onGrade} />
      ) : (
        <Button title="Show answer" onPress={() => setRevealed(true)} />
      )}
    </>
  );
}

const RESULT_TEXT: Record<AnswerResult, string> = {
  exact: 'Correct!',
  accent: 'Correct — watch the accents',
  typo: 'Almost — small typo',
  wrong: 'Not quite',
};

/** Recall: type the word from its meaning, a sentence blank, or its sound. */
function RecallCard({
  card,
  kind,
  cloze,
  onGrade,
}: {
  card: KnownWord;
  kind: Exclude<ExerciseKind, 'flip'>;
  cloze: Cloze | null;
  onGrade: (g: Grade) => void;
}) {
  const t = useTheme();
  const speechRate = useStore((s) => s.settings.speechRate);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<AnswerResult | null>(null);
  const expected = kind === 'cloze' && cloze ? cloze.answer : card.word;

  useEffect(() => {
    if (kind === 'listen') void speak(card.word, card.lang, { id: `listen:${card.id}`, rate: speechRate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const check = (giveUp = false) => setResult(giveUp ? 'wrong' : checkAnswer(input, expected));
  const suggested = result ? SUGGESTED_GRADE[result] : undefined;
  const resultColor = result === 'exact' || result === 'accent' ? t.success : result === 'typo' ? t.accent : t.danger;

  return (
    <>
      <Card style={styles.card}>
        {kind === 'type' && (
          <>
            <T variant="small">Type the word for</T>
            <T variant="big">{card.gloss || '(no meaning)'}</T>
          </>
        )}
        {kind === 'cloze' && cloze && (
          <>
            <T variant="small">Fill in the blank</T>
            <T style={{ fontSize: 24, lineHeight: 34, textAlign: 'center' }}>
              {cloze.before}
              <T style={{ fontSize: 24, fontWeight: '700', color: result ? resultColor : t.primary }}>
                {result ? cloze.answer : '_____'}
              </T>
              {cloze.after}
            </T>
            {!!cloze.sentence.translation && (
              <T variant="muted" style={{ textAlign: 'center' }}>
                “{cloze.sentence.translation}”
              </T>
            )}
            <T variant="small" style={{ textAlign: 'center' }}>
              Hint: {cloze.answer.toLowerCase() === card.word.toLowerCase() ? card.gloss : `${card.word} — ${card.gloss}`}
            </T>
          </>
        )}
        {kind === 'listen' && (
          <>
            <T variant="small">Type what you hear</T>
            <SpeakButton text={card.word} lang={card.lang} size={44} id={`listen:${card.id}`} />
            <T variant="small">Long-press to hear it slowly</T>
          </>
        )}
      </Card>

      {result === null ? (
        <View style={{ gap: space.sm }}>
          <Input
            value={input}
            onChangeText={setInput}
            placeholder="Your answer"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => input.trim() && check()}
          />
          <Row style={{ flexWrap: 'nowrap' }}>
            <Button title="Check" onPress={() => check()} disabled={!input.trim()} style={{ flex: 1 }} />
            <Button title="Show me" variant="secondary" onPress={() => check(true)} style={{ flex: 1 }} />
          </Row>
        </View>
      ) : (
        <Card style={{ borderColor: resultColor, borderWidth: 2 }}>
          <T style={{ color: resultColor, fontWeight: '700' }}>{RESULT_TEXT[result]}</T>
          <Row>
            <T variant="heading">{expected}</T>
            <SpeakButton text={kind === 'cloze' && cloze ? cloze.sentence.text : card.word} lang={card.lang} />
          </Row>
          {input.trim() && result !== 'exact' && <T variant="muted">You wrote: {input.trim()}</T>}
          {kind !== 'type' && <T variant="muted">{card.gloss}</T>}
          {kind === 'cloze' && cloze && result !== 'exact' && (
            <ExplainButton sentence={cloze.sentence.text} translation={cloze.sentence.translation} focus={cloze.answer} />
          )}
          <T variant="small">Suggested grade is highlighted — pick another if you disagree.</T>
          <GradeButtons card={card} onGrade={onGrade} suggested={suggested} />
        </Card>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 240, justifyContent: 'center', alignItems: 'center', borderRadius: radius.lg, gap: space.lg },
  divider: { height: 1, alignSelf: 'stretch' },
});
