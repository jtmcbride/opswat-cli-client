import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { glossFor, Sentence } from '@/components/Sentence';
import { SpeakButton } from '@/components/SpeakButton';
import { Button, Empty, Input, Row, Screen, T } from '@/components/ui';
import { MAX_WIDTH, radius, space, useTheme } from '@/constants/theme';
import { useApiKey } from '@/hooks/useApiKey';
import { useDictionary, useKnown } from '@/hooks/useDictionary';
import { chatReply, type ChatTurn } from '@/lib/ai';
import { withArticle } from '@/lib/grammar';
import { languageName, useStore } from '@/store/useStore';

const EMPTY: ChatTurn[] = [];

export default function ChatScreen() {
  const t = useTheme();
  const [apiKey] = useApiKey();
  const lang = useStore((s) => s.settings.activeLang);
  const settings = useStore((s) => s.settings);
  const custom = useStore((s) => s.customLanguages);
  const turns = useStore((s) => s.chats[lang] ?? EMPTY);
  const setChat = useStore((s) => s.setChat);
  const addWord = useStore((s) => s.addWord);
  const { index } = useDictionary(lang);
  const { words, lemmas } = useKnown(lang, index);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [peek, setPeek] = useState<{ word: string; lemma: string; gloss?: string } | null>(null);
  const list = useRef<FlatList<ChatTurn>>(null);

  if (apiKey === undefined) return <Screen>{null}</Screen>;
  if (!apiKey) {
    return (
      <Screen>
        <Empty
          icon="chatbubbles-outline"
          title="Chat with an AI tutor"
          body="Practice conversation using the words you know. Add your Anthropic API key in Settings to start.">
          <Button title="Open Settings" onPress={() => router.push('/settings')} />
        </Empty>
      </Screen>
    );
  }

  const send = async (history: ChatTurn[]) => {
    setSending(true);
    setError(null);
    try {
      const reply = await chatReply({
        apiKey,
        model: settings.aiModel,
        language: languageName(lang, custom),
        nativeLanguage: settings.nativeLang,
        knownWords: words.map((w) => w.word),
        history,
      });
      setChat(lang, [...history, { role: 'assistant', text: reply }]);
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

  // The API requires the conversation to open with a user turn, so a fresh chat starts with a greeting prompt.
  const start = () => {
    const history: ChatTurn[] = [{ role: 'user', text: '👋' }];
    setChat(lang, history);
    void send(history);
  };

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: t.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <FlatList
          ref={list}
          data={turns}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <Empty
              icon="chatbubbles-outline"
              title={`Chat in ${languageName(lang, custom)}`}
              body="The tutor sticks mostly to words you know and introduces a few new ones. Tap any word for its meaning.">
              <Button title="Start a conversation" onPress={start} loading={sending} />
            </Empty>
          }
          renderItem={({ item, index: i }) =>
            item.role === 'user' ? (
              <View style={[styles.bubble, styles.user, { backgroundColor: t.primary }]}>
                <T style={{ color: t.primaryText }}>{item.text}</T>
              </View>
            ) : (
              <View style={[styles.bubble, styles.assistant, { backgroundColor: t.surface, borderColor: t.border }]}>
                {index ? (
                  <Sentence
                    text={item.text}
                    index={index}
                    known={lemmas}
                    style={{ fontSize: 17, lineHeight: 24 }}
                    onWordPress={(word, ls) =>
                      setPeek({ word, lemma: index.get(ls[0])?.lemma ?? word, gloss: glossFor(index, word, ls) })
                    }
                  />
                ) : (
                  <T>{item.text}</T>
                )}
                <View style={{ alignSelf: 'flex-end', marginTop: space.xs }}>
                  <SpeakButton text={item.text} lang={lang} size={18} id={`chat:${i}`} />
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
          <Pressable
            onPress={() => setPeek(null)}
            style={[styles.peek, { backgroundColor: t.surface, borderColor: t.border }]}>
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
            <Button title="New" variant="ghost" compact onPress={() => setChat(lang, [])} />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, gap: space.sm, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', flexGrow: 1 },
  bubble: { padding: space.md, borderRadius: radius.lg, maxWidth: '85%' },
  user: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  assistant: { alignSelf: 'flex-start', borderWidth: StyleSheet.hairlineWidth, borderBottomLeftRadius: 4 },
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
