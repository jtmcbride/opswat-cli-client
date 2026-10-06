import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { glossFor, Sentence } from '@/components/Sentence';
import { SpeakButton } from '@/components/SpeakButton';
import { Button, Card, Empty, Input, Row, Screen, T } from '@/components/ui';
import { MAX_WIDTH, radius, space, useTheme } from '@/constants/theme';
import { useApiKey } from '@/hooks/useApiKey';
import { useDictionary, useKnown } from '@/hooks/useDictionary';
import { chatReply, type ChatTurn, type Correction } from '@/lib/ai';
import { withArticle } from '@/lib/grammar';
import { SCENARIOS } from '@/lib/scenarios';
import { normalize } from '@/lib/tokenize';
import { languageName, useStore } from '@/store/useStore';

const EMPTY: ChatTurn[] = [];

export default function ChatScreen() {
  const t = useTheme();
  const [apiKey] = useApiKey();
  const lang = useStore((s) => s.settings.activeLang);
  const settings = useStore((s) => s.settings);
  const custom = useStore((s) => s.customLanguages);
  const turns = useStore((s) => s.chats[lang] ?? EMPTY);
  const scenario = useStore((s) => s.chatScenarios[lang]);
  const setChat = useStore((s) => s.setChat);
  const addWord = useStore((s) => s.addWord);
  const { index } = useDictionary(lang);
  const { words, lemmas } = useKnown(lang, index);
  const [draft, setDraft] = useState('');
  const [customScenario, setCustomScenario] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [peek, setPeek] = useState<{ word: string; lemma: string; gloss?: string } | null>(null);
  const list = useRef<FlatList<{ turn: ChatTurn; i: number }>>(null);
  const savedPhrases = useMemo(() => new Set(words.map((w) => normalize(w.word))), [words]);
  const visible = useMemo(() => turns.map((turn, i) => ({ turn, i })).filter(({ turn }) => !turn.hidden), [turns]);

  if (apiKey === undefined) return <Screen>{null}</Screen>;
  if (!apiKey) {
    return (
      <Screen>
        <Empty
          icon="chatbubbles-outline"
          title="Chat with an AI tutor"
          body="Practice conversation and role-plays using the words you know, with corrections you can save as flashcards. Add your Anthropic API key in Settings to start.">
          <Button title="Open Settings" onPress={() => router.push('/settings')} />
        </Empty>
      </Screen>
    );
  }

  const scenarioTitle = SCENARIOS.find((s) => s.prompt === scenario)?.title ?? (scenario ? 'Custom role-play' : null);

  const send = async (history: ChatTurn[], scenarioPrompt = scenario) => {
    setSending(true);
    setError(null);
    try {
      const r = await chatReply({
        apiKey,
        model: settings.aiModel,
        language: languageName(lang, custom),
        nativeLanguage: settings.nativeLang,
        knownWords: words.map((w) => w.word),
        history,
        scenario: scenarioPrompt,
      });
      // Attach corrections to the learner's last message.
      const withCorrections = history.map((turn, i) =>
        i === history.length - 1 && turn.role === 'user' && r.corrections.length ? { ...turn, corrections: r.corrections } : turn,
      );
      setChat(lang, [...withCorrections, { role: 'assistant', text: r.reply, glosses: r.glosses }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
      setTimeout(() => list.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  const submit = () => {
    const text = draft.trim();
    if (!text || sending) return;
    const history: ChatTurn[] = [...turns, { role: 'user', text }];
    setChat(lang, history);
    setDraft('');
    void send(history);
  };

  // The API needs the conversation to open with a user turn; it's hidden from the transcript.
  const start = (scenarioPrompt?: string) => {
    const history: ChatTurn[] = [
      { role: 'user', text: scenarioPrompt ? '(Start the role-play: speak first.)' : '(Greet me and start a conversation.)', hidden: true },
    ];
    setChat(lang, history, scenarioPrompt ?? null);
    void send(history, scenarioPrompt);
  };

  const saveCorrection = (c: Correction) => addWord(lang, c.corrected, c.translation);

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: t.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        {turns.length > 0 && scenarioTitle && (
          <View style={[styles.banner, { backgroundColor: t.surfaceAlt }]}>
            <Ionicons name="film-outline" size={16} color={t.textMuted} />
            <T variant="small" style={{ flex: 1 }}>
              Role-play: {scenarioTitle}
            </T>
          </View>
        )}
        <FlatList
          ref={list}
          data={visible}
          keyExtractor={({ i }) => String(i)}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            sending ? (
              <T variant="muted">Starting…</T>
            ) : (
              <View style={{ gap: space.lg }}>
                <Empty
                  icon="chatbubbles-outline"
                  title={`Chat in ${languageName(lang, custom)}`}
                  body="The tutor sticks mostly to words you know, corrects your mistakes (save them as flashcards), and you can tap any word for its meaning.">
                  <Button title="Free conversation" onPress={() => start()} />
                </Empty>
                <T variant="heading">Or role-play a situation</T>
                <View style={{ gap: space.sm }}>
                  {SCENARIOS.map((s) => (
                    <Pressable
                      key={s.id}
                      onPress={() => start(s.prompt)}
                      style={({ pressed }) => [styles.scenario, { backgroundColor: t.surface, borderColor: t.border, opacity: pressed ? 0.7 : 1 }]}>
                      <Ionicons name={s.icon} size={20} color={t.primary} />
                      <T>{s.title}</T>
                    </Pressable>
                  ))}
                </View>
                <Row style={{ flexWrap: 'nowrap' }}>
                  <Input
                    style={{ flex: 1 }}
                    value={customScenario}
                    onChangeText={setCustomScenario}
                    placeholder="Or describe your own situation…"
                    autoCapitalize="sentences"
                  />
                  <Button compact title="Start" disabled={!customScenario.trim()} onPress={() => start(customScenario.trim())} />
                </Row>
              </View>
            )
          }
          renderItem={({ item: { turn, i } }) =>
            turn.role === 'user' ? (
              <View style={{ alignSelf: 'flex-end', maxWidth: '85%', gap: space.xs }}>
                <View style={[styles.bubble, { backgroundColor: t.primary, borderBottomRightRadius: 4 }]}>
                  <T style={{ color: t.primaryText }}>{turn.text}</T>
                </View>
                {turn.corrections?.map((c, ci) => (
                  <Card key={ci} style={{ padding: space.md, gap: space.xs, borderColor: t.accent }}>
                    <T variant="small">Correction</T>
                    <T style={{ fontWeight: '600' }}>{c.corrected}</T>
                    <T variant="muted">{c.note}</T>
                    <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                      <T variant="small" style={{ flex: 1 }}>
                        “{c.translation}”
                      </T>
                      {savedPhrases.has(normalize(c.corrected)) ? (
                        <T variant="small">Saved</T>
                      ) : (
                        <Button compact variant="secondary" icon="add" title="Save as card" onPress={() => saveCorrection(c)} />
                      )}
                    </Row>
                  </Card>
                ))}
              </View>
            ) : (
              <View style={[styles.bubble, styles.assistant, { backgroundColor: t.surface, borderColor: t.border }]}>
                {index ? (
                  <Sentence
                    text={turn.text}
                    index={index}
                    known={lemmas}
                    style={{ fontSize: 17, lineHeight: 24 }}
                    onWordPress={(word, ls) =>
                      setPeek({ word, lemma: index.get(ls[0])?.lemma ?? word, gloss: glossFor(index, word, ls, turn.glosses) })
                    }
                  />
                ) : (
                  <T>{turn.text}</T>
                )}
                <View style={{ alignSelf: 'flex-end', marginTop: space.xs }}>
                  <SpeakButton text={turn.text} lang={lang} size={18} id={`chat:${i}`} />
                </View>
              </View>
            )
          }
          ListFooterComponent={
            <View style={{ gap: space.sm }}>
              {sending && turns.length > 0 && <T variant="muted">…</T>}
              {error && (
                <Row>
                  <T style={{ color: t.danger, flex: 1 }}>{error}</T>
                  <Button compact variant="secondary" title="Retry" onPress={() => send(turns)} />
                </Row>
              )}
            </View>
          }
        />
        {peek && (
          <Pressable onPress={() => setPeek(null)} style={[styles.peek, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={{ flex: 1 }}>
              <T style={{ fontWeight: '600' }}>
                {index?.get(peek.lemma) ? withArticle(lang, peek.lemma, index.get(peek.lemma)?.gender) : peek.lemma}
              </T>
              <T variant="muted">{peek.gloss ?? 'Not in dictionary'}</T>
            </View>
            <SpeakButton text={peek.word} lang={lang} size={20} />
            {peek.gloss && (
              <Button
                compact
                title="Add"
                icon="add"
                onPress={() => {
                  addWord(lang, peek.lemma, peek.gloss ?? '');
                  setPeek(null);
                }}
              />
            )}
          </Pressable>
        )}
        {turns.length > 0 && (
          <View style={[styles.composer, { borderTopColor: t.border, backgroundColor: t.surface }]}>
            <Input
              style={{ flex: 1 }}
              value={draft}
              onChangeText={setDraft}
              placeholder="Write a message…"
              onSubmitEditing={submit}
              returnKeyType="send"
              autoCorrect
            />
            <Button title="Send" onPress={submit} disabled={!draft.trim() || sending} compact />
            <Button title="New" variant="ghost" compact onPress={() => setChat(lang, [], null)} />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, gap: space.sm, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', flexGrow: 1 },
  bubble: { padding: space.md, borderRadius: radius.lg },
  assistant: { alignSelf: 'flex-start', maxWidth: '85%', borderWidth: StyleSheet.hairlineWidth, borderBottomLeftRadius: 4 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm },
  scenario: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  peek: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    margin: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
