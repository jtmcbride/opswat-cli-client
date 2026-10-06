import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MilestoneBanner, WeeklyRecap } from '@/components/Celebrations';
import { SpeakButton } from '@/components/SpeakButton';
import { Button, Card, Chip, Input, Row, T } from '@/components/ui';
import { MAX_WIDTH, space, useTheme } from '@/constants/theme';
import { useDictionary, useKnown } from '@/hooks/useDictionary';
import { useNow } from '@/hooks/useNow';
import { dayKey, streak } from '@/lib/activity';
import { buildQueue, directions } from '@/lib/queue';
import { isDue, isLeech, isNew } from '@/lib/srs';
import { normalize } from '@/lib/tokenize';
import type { DictEntry, KnownWord } from '@/lib/types';
import { useStore } from '@/store/useStore';

export default function WordsScreen() {
  const t = useTheme();
  const lang = useStore((s) => s.settings.activeLang);
  const addWord = useStore((s) => s.addWord);
  const addWords = useStore((s) => s.addWords);
  const { index } = useDictionary(lang);
  const { words, lemmas } = useKnown(lang, index);

  const [word, setWord] = useState('');
  const [gloss, setGloss] = useState('');
  const [glossTouched, setGlossTouched] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [bulk, setBulk] = useState('');
  const [filter, setFilter] = useState('');

  const suggestions = useMemo(
    () => (index && word.trim() ? index.search(word, 6).filter((e) => normalize(e.lemma) !== normalize(word)) : []),
    [index, word],
  );
  const dailyNewLimit = useStore((s) => s.settings.dailyNewLimit);
  const now = useNow();
  const dirs = directions(useStore((s) => s.settings.reviewDirection));
  const dueCount = useMemo(() => buildQueue(words, now, dailyNewLimit, dirs).cards.length, [words, now, dailyNewLimit, dirs]);
  const dailyGoal = useStore((s) => s.settings.dailyGoal);
  const days = useStore((s) => s.activity[lang]);
  const streakDays = streak(days, now);
  const todayReviews = days?.[dayKey(now)]?.reviews ?? 0;
  const shown = useMemo(() => {
    const f = normalize(filter);
    const list = f ? words.filter((w) => normalize(w.word).includes(f) || w.gloss.toLowerCase().includes(f)) : words;
    return [...list].sort((a, b) => b.addedAt - a.addedAt);
  }, [words, filter]);

  const onWordChange = (v: string) => {
    setWord(v);
    setMessage(null);
    if (!glossTouched) setGloss(index?.lookup(v)?.gloss ?? '');
  };

  const pick = (e: DictEntry) => {
    setWord(e.lemma);
    setGloss(e.gloss);
    setGlossTouched(false);
  };

  const submit = () => {
    const w = word.trim();
    if (!w) return;
    const entry = index?.lookup(w);
    // Store the dictionary form when the user typed an inflection of a known entry.
    const display = entry && normalize(entry.lemma) !== normalize(w) && !glossTouched ? entry.lemma : w;
    const added = addWord(lang, display, gloss || entry?.gloss || '');
    setMessage(added ? `Added “${display}”` : `“${display}” is already in your words`);
    setWord('');
    setGloss('');
    setGlossTouched(false);
  };

  const submitBulk = () => {
    const items = bulk
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [w, g] = line.split(/\t| = | - |;|,/).map((s) => s.trim());
        const entry = index?.lookup(w);
        return { word: entry && !g ? entry.lemma : w, gloss: g || entry?.gloss || '' };
      });
    const n = addWords(lang, items);
    setMessage(`Added ${n} of ${items.length} words`);
    setBulk('');
  };

  const addStarter = (n: number) => {
    if (!index) return;
    const items = index.entries
      .filter((e) => !lemmas.has(normalize(e.lemma)))
      .sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9))
      .slice(0, n)
      .map((e) => ({ word: e.lemma, gloss: e.gloss }));
    const added = addWords(lang, items);
    setMessage(`Added ${added} common words`);
  };

  const header = (
    <View style={{ gap: space.lg, paddingBottom: space.md }}>
      <Pressable
        onPress={() => router.push('/stats')}
        accessibilityRole="button"
        accessibilityLabel="Progress and stats"
        style={({ pressed }) => [styles.habit, { backgroundColor: t.surface, borderColor: t.border, opacity: pressed ? 0.7 : 1 }]}>
        <Ionicons name="flame" size={22} color={streakDays > 0 ? t.accent : t.textMuted} />
        <View style={{ flex: 1 }}>
          <T style={{ fontWeight: '600' }}>
            {streakDays > 0 ? `${streakDays}-day streak` : 'Start a streak today'}
          </T>
          <T variant="small">
            Today {todayReviews} / {dailyGoal} reviews
          </T>
        </View>
        <View style={[styles.goalTrack, { backgroundColor: t.surfaceAlt }]}>
          <View
            style={{
              width: `${Math.min(1, todayReviews / Math.max(1, dailyGoal)) * 100}%`,
              height: '100%',
              backgroundColor: todayReviews >= dailyGoal ? t.success : t.primary,
            }}
          />
        </View>
        <Ionicons name="stats-chart" size={18} color={t.textMuted} />
      </Pressable>
      <MilestoneBanner lang={lang} />
      <WeeklyRecap lang={lang} />
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="muted">
          {words.length} words · {dueCount} to study
        </T>
        <Row>
          <Chip label="One" selected={mode === 'single'} onPress={() => setMode('single')} />
          <Chip label="Bulk" selected={mode === 'bulk'} onPress={() => setMode('bulk')} />
        </Row>
      </Row>

      {mode === 'single' ? (
        <Card>
          <T variant="heading">Add a word you know</T>
          <Input
            placeholder="Word"
            value={word}
            onChangeText={onWordChange}
            onSubmitEditing={submit}
            returnKeyType="done"
          />
          {suggestions.length > 0 && (
            <View style={{ gap: 2 }}>
              {suggestions.map((e) => (
                <Pressable
                  key={e.lemma}
                  onPress={() => pick(e)}
                  style={({ pressed }) => [styles.suggestion, { backgroundColor: pressed ? t.surfaceAlt : 'transparent' }]}>
                  <T style={{ fontWeight: '600' }}>{e.lemma}</T>
                  <T variant="muted" numberOfLines={1} style={{ flex: 1 }}>
                    {e.gloss}
                  </T>
                </Pressable>
              ))}
            </View>
          )}
          <Input
            placeholder="Meaning (auto-filled from dictionary)"
            value={gloss}
            onChangeText={(v) => {
              setGloss(v);
              setGlossTouched(true);
            }}
            onSubmitEditing={submit}
          />
          <Button title="Add" icon="add" onPress={submit} disabled={!word.trim()} />
        </Card>
      ) : (
        <Card>
          <T variant="heading">Paste words</T>
          <T variant="small">One per line. Optionally add a meaning: “casa - house”. Meanings are filled from the dictionary when omitted.</T>
          <Input multiline value={bulk} onChangeText={setBulk} placeholder={'casa\nperro - dog\n…'} />
          <Button title="Add all" icon="add" onPress={submitBulk} disabled={!bulk.trim()} />
        </Card>
      )}

      {message && <T variant="muted">{message}</T>}

      {words.length < 20 && index && index.size > 0 && (
        <Card>
          <T variant="heading">Just starting?</T>
          <T variant="muted">
            Already know some words? Take a 2-minute placement test. Or add the most common words and remove any you
            don&apos;t know.
          </T>
          <Button title="Placement test" icon="school-outline" onPress={() => router.push('/placement')} />
          <Row>
            <Button compact variant="secondary" title="+ 25 words" onPress={() => addStarter(25)} />
            <Button compact variant="secondary" title="+ 100 words" onPress={() => addStarter(100)} />
          </Row>
        </Card>
      )}

      {words.length > 0 && <Input placeholder="Search your words" value={filter} onChangeText={setFilter} />}
    </View>
  );

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: t.bg }}>
      <FlatList
        data={shown}
        keyExtractor={(w) => w.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <WordRow word={item} />}
        ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.border }} />}
        ListEmptyComponent={
          words.length === 0 ? (
            <T variant="muted" style={{ textAlign: 'center', marginTop: space.xl }}>
              No words yet. Add some above, or{' '}
              <Link href="/dictionaries" style={{ color: t.primary }}>
                import a dictionary
              </Link>
              .
            </T>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function WordRow({ word }: { word: KnownWord }) {
  const t = useTheme();
  const states = word.produce ? [word.srs, word.produce] : [word.srs];
  const due = !word.suspended && states.some((s) => !isNew(s) && isDue(s));
  const tag = word.suspended ? 'suspended' : states.some(isLeech) ? 'leech' : isNew(word.srs) ? 'new' : null;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/word/[id]', params: { id: word.id } })}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? t.surfaceAlt : 'transparent' }]}>
      <View style={{ flex: 1 }}>
        <T style={{ fontWeight: '600' }}>{word.word}</T>
        <T variant="muted" numberOfLines={1}>
          {word.gloss || '(no meaning)'}
        </T>
      </View>
      {tag && (
        <T variant="small" style={[styles.tag, { backgroundColor: tag === 'leech' ? t.accentSoft : t.surfaceAlt }]}>
          {tag}
        </T>
      )}
      <SpeakButton text={word.word} lang={word.lang} size={20} id={`word:${word.id}`} />
      {due && <View style={[styles.dot, { backgroundColor: t.accent }]} />}
      <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  suggestion: { flexDirection: 'row', gap: space.sm, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 12, paddingHorizontal: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  habit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  goalTrack: { width: 64, height: 8, borderRadius: 4, overflow: 'hidden' },
});
