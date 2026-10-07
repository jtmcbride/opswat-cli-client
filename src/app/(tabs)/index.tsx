import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MilestoneBanner, WeeklyRecap } from '@/components/Celebrations';
import { SpeakButton } from '@/components/SpeakButton';
import { Button, Input, Row, T } from '@/components/ui';
import { DailyReviewCard } from '@/components/words/DailyReviewCard';
import { WelcomeCard } from '@/components/words/WelcomeCard';
import { WordEntryForm } from '@/components/words/WordEntryForm';
import { space, useTheme, useWideLayout, WORKSPACE_WIDTH } from '@/constants/theme';
import { useDictionary, useKnown } from '@/hooks/useDictionary';
import { useNow } from '@/hooks/useNow';
import { dayKey, streak } from '@/lib/activity';
import { buildQueue, directions } from '@/lib/queue';
import { isDue, isLeech, isNew } from '@/lib/srs';
import { normalize } from '@/lib/tokenize';
import type { KnownWord } from '@/lib/types';
import { languageName, useStore } from '@/store/useStore';

export default function WordsScreen() {
  const lang = useStore((s) => s.settings.activeLang);
  // Drafts, searches, and notices belong to the selected language.
  return <WordsWorkspace key={lang} lang={lang} />;
}

function WordsWorkspace({ lang }: { lang: string }) {
  const t = useTheme();
  const wide = useWideLayout();
  const custom = useStore((s) => s.customLanguages);
  const addWords = useStore((s) => s.addWords);
  const { index } = useDictionary(lang);
  const { words, lemmas } = useKnown(lang, index);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const dailyNewLimit = useStore((s) => s.settings.dailyNewLimit);
  const now = useNow();
  const dirs = directions(useStore((s) => s.settings.reviewDirection));
  const due = useMemo(() => buildQueue(words, now, dailyNewLimit, dirs).cards.length, [words, now, dailyNewLimit, dirs]);
  const goal = useStore((s) => s.settings.dailyGoal);
  const days = useStore((s) => s.activity[lang]);
  const todayReviews = days?.[dayKey(now)]?.reviews ?? 0;
  const shown = useMemo(() => {
    const query = normalize(filter);
    const list = query ? words.filter((w) => normalize(w.word).includes(query) || normalize(w.gloss).includes(query)) : words;
    return [...list].sort((a, b) => b.addedAt - a.addedAt);
  }, [words, filter]);
  const addStarter = (count: number) => {
    if (!index) return;
    const items = index.entries.filter((e) => !lemmas.has(normalize(e.lemma)))
      .sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9)).slice(0, count).map((e) => ({ word: e.lemma, gloss: e.gloss }));
    setMessage(`Added ${addWords(lang, items)} common words. Your first review is ready.`);
  };

  const header = (
    <View style={{ gap: wide ? space.xl : space.lg, paddingBottom: words.length ? space.lg : 0 }}>
      {(words.length > 0 || adding) && (
        <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ gap: 4 }}>
            <T variant="title" accessibilityRole="header">Your words</T>
            <T variant="muted">{words.length.toLocaleString()} {words.length === 1 ? 'word' : 'words'}{wide ? ', one growing vocabulary.' : ''}</T>
          </View>
          <Button compact variant="outline" title={adding ? 'Close' : 'Add word'} icon={adding ? 'close' : 'add'} accessibilityExpanded={adding} onPress={() => setAdding(!adding)} />
        </Row>
      )}
      {adding && <WordEntryForm lang={lang} index={index} onClose={() => setAdding(false)} onMessage={setMessage} />}
      {message && (
        <Row style={[styles.notice, { backgroundColor: t.primarySoft, flexWrap: 'nowrap' }]}>
          <T accessibilityLiveRegion="polite" style={{ flex: 1, color: t.primary, fontSize: 14 }}>{message}</T>
          <Button compact variant="ghost" title="" icon="close" accessibilityLabel="Dismiss message" onPress={() => setMessage(null)} />
        </Row>
      )}
      {words.length === 0 ? (
        !adding && <WelcomeCard lang={lang} language={languageName(lang, custom)} ready={!!index?.size} loading={!index} onStarter={addStarter} onAdd={() => setAdding(true)} />
      ) : (
        <>
          <DailyReviewCard due={due} streak={streak(days, now)} reviews={todayReviews} goal={goal} />
          <View style={{ gap: space.sm }}>
            <T variant="small" style={{ fontWeight: '600' }}>Search your vocabulary</T>
            <View style={[styles.search, { backgroundColor: t.surface, borderColor: t.border }]}>
              <Ionicons name="search-outline" size={20} color={t.textMuted} accessible={false} aria-hidden />
              <Input accessibilityLabel="Search your words" placeholder="Search words or meanings" value={filter} onChangeText={setFilter} style={styles.searchInput} />
              {filter.length > 0 && <Button compact variant="ghost" title="" icon="close" accessibilityLabel="Clear search" onPress={() => setFilter('')} />}
            </View>
          </View>
          <Row style={{ justifyContent: 'space-between' }}>
            <T variant="small" style={{ fontWeight: '600' }}>{filter ? `${shown.length} ${shown.length === 1 ? 'match' : 'matches'}` : 'Recently added'}</T>
            {words.length < 20 && <Button compact variant="ghost" title="Find my level" onPress={() => router.push('/placement')} />}
          </Row>
        </>
      )}
    </View>
  );
  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: t.bg }}>
      <FlatList
        data={shown}
        keyExtractor={(word) => word.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        contentContainerStyle={[styles.list, { padding: wide ? 36 : 16, paddingTop: wide ? 14 : 20, paddingBottom: 40 }]}
        renderItem={({ item, index: row }) => <WordRow word={item} now={now} first={row === 0} last={row === shown.length - 1} />}
        ListEmptyComponent={words.length > 0 ? <View style={{ padding: 32, gap: 8, alignItems: 'center' }}><T variant="heading">No matching words</T><T variant="muted">Try another word or meaning.</T><Button variant="ghost" title="Clear search" onPress={() => setFilter('')} /></View> : null}
        ListFooterComponent={words.length > 0 ? <View style={{ gap: space.lg, paddingTop: space.xl }}><MilestoneBanner lang={lang} /><WeeklyRecap lang={lang} /></View> : null}
      />
    </SafeAreaView>
  );
}

function WordRow({ word, now, first, last }: { word: KnownWord; now: number; first: boolean; last: boolean }) {
  const t = useTheme();
  const wide = useWideLayout();
  const states = word.produce ? [word.srs, word.produce] : [word.srs];
  const due = !word.suspended && states.some((s) => !isNew(s) && isDue(s, now));
  const tag = word.suspended ? 'Paused' : states.some(isLeech) ? 'Needs practice' : isNew(word.srs) ? 'New' : due ? 'Due' : null;
  return (
    <View style={[styles.wordRow, { backgroundColor: t.surface, borderColor: t.border, borderTopWidth: first ? 1 : 0, borderTopLeftRadius: first ? 16 : 0, borderTopRightRadius: first ? 16 : 0, borderBottomLeftRadius: last ? 16 : 0, borderBottomRightRadius: last ? 16 : 0 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${word.word}, ${word.gloss || 'no meaning'}${tag ? `, ${tag}` : ''}. Open word details.`}
        onPress={() => router.push({ pathname: '/word/[id]', params: { id: word.id } })}
        style={({ pressed }) => [styles.wordDetails, { opacity: pressed ? 0.6 : 1 }]}>
        <View style={[{ flex: 1, gap: 3 }, wide && { flexDirection: 'row', gap: 24, alignItems: 'center' }]}>
          <T numberOfLines={2} style={{ fontWeight: '600', flex: wide ? 1 : undefined }}>{word.word}</T>
          <T variant="muted" numberOfLines={wide ? 2 : 1} style={{ flex: wide ? 1.4 : undefined }}>{word.gloss || '(no meaning)'}</T>
        </View>
        {tag && <T variant="small" style={[styles.tag, { color: tag === 'Due' || tag === 'Needs practice' ? t.accent : t.primary, backgroundColor: tag === 'Due' || tag === 'Needs practice' ? t.accentSoft : t.primarySoft }]}>{tag}</T>}
        <Ionicons name="chevron-forward" size={17} color={t.textMuted} accessible={false} aria-hidden />
      </Pressable>
      <SpeakButton text={word.word} lang={word.lang} size={19} id={`word:${word.id}`} />
    </View>
  );
}
const styles = StyleSheet.create({
  list: { width: '100%', maxWidth: WORKSPACE_WIDTH, alignSelf: 'center' },
  notice: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  search: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingLeft: 14 },
  searchInput: { flex: 1, minWidth: 0, borderWidth: 0, backgroundColor: 'transparent', minHeight: 50 },
  wordRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 12, gap: 2 },
  wordDetails: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 4, minHeight: 76 },
  tag: { fontSize: 11, fontWeight: '500', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, maxWidth: 90 },
});
