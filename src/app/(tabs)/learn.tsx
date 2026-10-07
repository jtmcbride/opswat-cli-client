import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ExplainButton } from '@/components/ExplainButton';
import { SayIt } from '@/components/SayIt';
import { glossFor, Sentence } from '@/components/Sentence';
import { SpeakButton } from '@/components/SpeakButton';
import { Button, Card, Chip, Empty, Row, Screen, T } from '@/components/ui';
import { radius, space, useTheme } from '@/constants/theme';
import { useApiKey } from '@/hooks/useApiKey';
import { useDictionary, useKnown } from '@/hooks/useDictionary';
import { generateSentences } from '@/lib/ai';
import { distractors, pickExercise, seededRandom, shuffle, type Exercise } from '@/lib/picker';
import { withArticle } from '@/lib/grammar';
import { normalize } from '@/lib/tokenize';
import type { DictEntry } from '@/lib/types';
import { languageName, useStore } from '@/store/useStore';

type Mode = 'choice' | 'reveal';

/** An exercise the learner has already moved past in this session. */
type Past = { exercise: Exercise; target: DictEntry };

export default function LearnScreen() {
  const lang = useStore((s) => s.settings.activeLang);
  // Remount per language so per-exercise state resets.
  return <LearnSession key={lang} lang={lang} />;
}

function LearnSession({ lang }: { lang: string }) {
  const t = useTheme();
  const settings = useStore((s) => s.settings);
  const custom = useStore((s) => s.customLanguages);
  const recent = useStore((s) => s.recentSentences[lang]);
  const markSentenceSeen = useStore((s) => s.markSentenceSeen);
  const addWord = useStore((s) => s.addWord);
  const addExtraSentences = useStore((s) => s.addExtraSentences);
  const { index, sentences } = useDictionary(lang);
  const { words, lemmas } = useKnown(lang, index);
  const [apiKey] = useApiKey();

  const [round, setRound] = useState(() => Math.floor(Math.random() * 1e9));
  const [mode, setMode] = useState<Mode>('choice');
  const [answered, setAnswered] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [peek, setPeek] = useState<{ word: string; gloss?: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Exercises already left this session, oldest first; `viewing` is the one being revisited.
  const [history, setHistory] = useState<Past[]>([]);
  const [viewing, setViewing] = useState<number | null>(null);
  const [showList, setShowList] = useState(false);

  // Recomputed only when the inputs change: moving on (round), adding a word, or new sentences.
  const exercise: Exercise | null | undefined = useMemo(() => {
    if (!index) return undefined;
    const random = seededRandom(round);
    const exclude = new Set(recent ?? []);
    // If everything left was seen recently, allow repeats rather than showing nothing.
    return (
      pickExercise(sentences, index, lemmas, { exclude, random }) ?? pickExercise(sentences, index, lemmas, { random })
    );
    // `recent` is deliberately omitted: it changes only when leaving an exercise, together with `round`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, sentences, lemmas, round]);

  const target: DictEntry | null = useMemo(() => {
    if (!exercise || !index) return null;
    const entry = index.get(exercise.target);
    const gloss = exercise.sentence.glosses?.[exercise.target] ?? entry?.gloss ?? '?';
    return entry ? { ...entry, gloss } : { lemma: exercise.target, gloss };
  }, [exercise, index]);

  const next = () => {
    if (exercise && target) {
      markSentenceSeen(lang, exercise.sentenceIndex);
      setHistory((h) => [...h, { exercise, target }]);
    }
    setRound((r) => r + 1);
    setAnswered(null);
    setRevealed(false);
    setPeek(null);
    setError(null);
  };

  const options = useMemo(() => {
    if (!target || !index) return [];
    const random = seededRandom(round);
    return shuffle([target.gloss, ...distractors(index, target, 3, random)], random);
  }, [target, index, round]);

  // The next most common dictionary word the learner doesn't know yet.
  const nextNewWord = useMemo(
    () =>
      index?.entries
        .filter((e) => !lemmas.has(normalize(e.lemma)))
        .sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9))[0],
    [index, lemmas],
  );

  const generate = async (word: string) => {
    if (!apiKey) return;
    setGenerating(true);
    setError(null);
    try {
      const fresh = await generateSentences({
        apiKey,
        model: settings.aiModel,
        language: languageName(lang, custom),
        nativeLanguage: settings.nativeLang,
        knownWords: words.map((w) => w.word),
        targetWord: word,
      });
      addExtraSentences(lang, fresh);
      setError(fresh.length ? null : 'No sentences returned.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  };

  if (!index || exercise === undefined) {
    return (
      <Screen>
        <T variant="muted">Loading…</T>
      </Screen>
    );
  }

  if (showList || viewing !== null) {
    const item = viewing !== null ? history[viewing] : null;
    return (
      <Screen>
        <Row style={{ justifyContent: 'space-between' }}>
          <Button
            compact
            variant="ghost"
            icon="arrow-back"
            title={exercise ? 'Back to current' : 'Back'}
            onPress={() => {
              setViewing(null);
              setShowList(false);
              setPeek(null);
            }}
          />
          {item ? (
            <Button compact variant="ghost" icon="list" title="All" onPress={() => { setViewing(null); setShowList(true); setPeek(null); }} />
          ) : (
            <T variant="muted">{history.length} this session</T>
          )}
        </Row>

        {item && viewing !== null ? (
          <>
            <T variant="muted">
              Sentence {viewing + 1} of {history.length}
            </T>
            <Card style={{ gap: space.lg }}>
              <Sentence
                text={item.exercise.sentence.text}
                index={index}
                known={lemmas}
                target={item.exercise.target}
                onWordPress={(word, ls) => setPeek({ word, gloss: glossFor(index, word, ls, item.exercise.sentence.glosses) })}
              />
              <Row>
                <SpeakButton text={item.exercise.sentence.text} lang={lang} id={`sentence:${item.exercise.sentenceIndex}`} />
                <SpeakButton text={item.exercise.sentence.text} lang={lang} rate="slow" id={`sentence-slow:${item.exercise.sentenceIndex}`} />
              </Row>
              {peek && (
                <Pressable onPress={() => setPeek(null)} style={[styles.peek, { backgroundColor: t.surfaceAlt }]}>
                  <T style={{ fontWeight: '600' }}>{peek.word}</T>
                  <T variant="muted" style={{ flex: 1 }}>
                    {peek.gloss ?? 'Not in dictionary'}
                  </T>
                  <SpeakButton text={peek.word} lang={lang} size={20} />
                </Pressable>
              )}
              <T variant="muted">“{item.exercise.sentence.translation}”</T>
              <SayIt target={item.exercise.sentence.text} lang={lang} />
            </Card>
            <Card>
              <T variant="heading">
                {withArticle(lang, item.target.lemma, item.target.gender)} — {item.target.gloss}
              </T>
              {lemmas.has(normalize(item.target.lemma)) ? (
                <T variant="small">In your words</T>
              ) : (
                <Button
                  title="Add to my words"
                  icon="add"
                  onPress={() => addWord(lang, item.target.lemma, item.target.gloss, item.exercise.sentence)}
                />
              )}
            </Card>
            <Row>
              <Button
                variant="secondary"
                icon="chevron-back"
                title="Previous"
                disabled={viewing === 0}
                onPress={() => { setViewing(viewing - 1); setPeek(null); }}
                style={{ flex: 1 }}
              />
              <Button
                variant="secondary"
                title={viewing === history.length - 1 ? (exercise ? 'Current' : 'Done') : 'Next'}
                onPress={() => {
                  setPeek(null);
                  if (viewing === history.length - 1) setViewing(null);
                  else setViewing(viewing + 1);
                }}
                style={{ flex: 1 }}
              />
            </Row>
          </>
        ) : (
          <View style={{ gap: space.sm }}>
            {history.map((h, i) => (
              <Pressable
                key={i}
                onPress={() => { setShowList(false); setViewing(i); setPeek(null); }}
                style={[styles.listItem, { backgroundColor: t.surface, borderColor: t.border }]}>
                <T>{h.exercise.sentence.text}</T>
                <T variant="small">{h.exercise.sentence.translation}</T>
                <T variant="small">
                  {h.target.lemma} — {h.target.gloss}
                </T>
              </Pressable>
            ))}
          </View>
        )}
      </Screen>
    );
  }

  const historyButton = history.length > 0 && (
    <Button
      compact
      variant="ghost"
      icon="time-outline"
      title={`History (${history.length})`}
      onPress={() => setViewing(history.length - 1)}
    />
  );

  if (!exercise || !target) {
    return (
      <Screen>
        {historyButton}
        <Empty
          icon="sparkles-outline"
          title="No new sentences right now"
          body={
            sentences.length
              ? 'You know every word in the available sentences. Add a word below or generate new sentences with AI.'
              : 'There are no example sentences for this language yet. Generate some with AI, or add words manually.'
          }
        />
        {nextNewWord && (
          <Card>
            <T variant="small">Next common word</T>
            <T variant="heading">{nextNewWord.lemma}</T>
            <T variant="muted">{nextNewWord.gloss}</T>
            <Row>
              <Button compact title="Add to my words" onPress={() => addWord(lang, nextNewWord.lemma, nextNewWord.gloss)} />
              {apiKey && (
                <Button
                  compact
                  variant="secondary"
                  title="Sentences with this word"
                  icon="sparkles"
                  loading={generating}
                  onPress={() => generate(nextNewWord.lemma)}
                />
              )}
            </Row>
          </Card>
        )}
        {!apiKey && (
          <Button variant="ghost" title="Connect AI in Settings for more sentences" onPress={() => router.push('/settings')} />
        )}
        {error && <T style={{ color: t.danger }}>{error}</T>}
      </Screen>
    );
  }

  const done = answered !== null || revealed;
  const correct = answered === target.gloss;
  const otherUnknown = exercise.unknown.length - 1;

  return (
    <Screen>
      {historyButton}
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="muted">Guess the highlighted word</T>
        <Row>
          <Chip label="Choices" selected={mode === 'choice'} onPress={() => setMode('choice')} />
          <Chip label="Reveal" selected={mode === 'reveal'} onPress={() => setMode('reveal')} />
        </Row>
      </Row>

      <Card style={{ gap: space.lg }}>
        <Sentence
          text={exercise.sentence.text}
          index={index}
          known={lemmas}
          target={exercise.target}
          onWordPress={(word, ls) => setPeek({ word, gloss: glossFor(index, word, ls, exercise.sentence.glosses) })}
        />
        <Row>
          <SpeakButton text={exercise.sentence.text} lang={lang} id={`sentence:${exercise.sentenceIndex}`} />
          <SpeakButton text={exercise.sentence.text} lang={lang} rate="slow" id={`sentence-slow:${exercise.sentenceIndex}`} />
        </Row>
        {peek && (
          <Pressable onPress={() => setPeek(null)} style={[styles.peek, { backgroundColor: t.surfaceAlt }]}>
            <T style={{ fontWeight: '600' }}>{peek.word}</T>
            <T variant="muted" style={{ flex: 1 }}>
              {peek.gloss ?? 'Not in dictionary'}
            </T>
            <SpeakButton text={peek.word} lang={lang} size={20} />
          </Pressable>
        )}
        {otherUnknown > 0 && (
          <T variant="small">
            {otherUnknown} other unfamiliar {otherUnknown === 1 ? 'word' : 'words'} underlined — tap any word for its meaning.
          </T>
        )}
        {done && <T variant="muted">“{exercise.sentence.translation}”</T>}
        {done && <SayIt target={exercise.sentence.text} lang={lang} />}
        {done && (
          <ExplainButton
            key={exercise.sentenceIndex}
            sentence={exercise.sentence.text}
            translation={exercise.sentence.translation}
            focus={target.lemma}
          />
        )}
      </Card>

      {!done && mode === 'choice' && (
        <View style={{ gap: space.sm }}>
          {options.map((o) => (
            <Button key={o} variant="secondary" title={o} onPress={() => setAnswered(o)} />
          ))}
          <Button variant="ghost" title="I don't know — show me" onPress={() => setRevealed(true)} />
        </View>
      )}
      {!done && mode === 'reveal' && <Button title="Show meaning" icon="eye" onPress={() => setRevealed(true)} />}

      {done && (
        <Card style={{ borderColor: answered === null ? t.border : correct ? t.success : t.danger, borderWidth: 2 }}>
          {answered !== null && (
            <T style={{ color: correct ? t.success : t.danger, fontWeight: '700' }}>{correct ? 'Correct!' : 'Not quite'}</T>
          )}
          <T variant="heading">
            {withArticle(lang, target.lemma, target.gender)} — {target.gloss}
          </T>
          <Row>
            <Button
              title="Add to my words"
              icon="add"
              onPress={() => {
                addWord(lang, target.lemma, target.gloss, exercise.sentence);
                next();
              }}
              style={{ flex: 1 }}
            />
            <Button variant="secondary" title="Skip" onPress={() => next()} style={{ flex: 1 }} />
          </Row>
        </Card>
      )}

      {apiKey && (
        <Button
          variant="ghost"
          icon="sparkles"
          title={`More sentences with “${target.lemma}”`}
          loading={generating}
          onPress={() => generate(target.lemma)}
        />
      )}
      {error && <T style={{ color: t.danger }}>{error}</T>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  listItem: { gap: space.xs, padding: space.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  peek: { flexDirection: 'row', gap: space.sm, padding: space.md, borderRadius: radius.md },
});
