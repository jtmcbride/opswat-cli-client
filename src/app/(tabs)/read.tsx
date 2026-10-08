import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { CoverageBar } from '@/components/CoverageBar';
import { Button, Card, Empty, Row, Screen, T } from '@/components/ui';
import { space, useTheme } from '@/constants/theme';
import { useDictionary, useKnown } from '@/hooks/useDictionary';
import { coverage } from '@/lib/reading';
import { useStore } from '@/store/useStore';

export default function ReadScreen() {
  const t = useTheme();
  const lang = useStore((s) => s.settings.activeLang);
  const allTexts = useStore((s) => s.texts);
  const texts = useMemo(() => allTexts.filter((x) => x.lang === lang), [allTexts, lang]);
  const { index } = useDictionary(lang);
  const { lemmas } = useKnown(lang, index);
  const stats = useMemo(
    () => (index ? new Map(texts.map((x) => [x.id, coverage(x.body, index, lemmas)])) : null),
    [texts, index, lemmas],
  );

  return (
    <Screen>
      <Row>
        <Button title="Add text" icon="add" onPress={() => router.push('/read/new')} style={{ flex: 1 }} />
        <Button
          title="AI story"
          icon="sparkles"
          variant="secondary"
          onPress={() => router.push({ pathname: '/read/new', params: { mode: 'ai' } })}
          style={{ flex: 1 }}
        />
        <Button
          title="Audio"
          icon="mic"
          variant="secondary"
          onPress={() => router.push({ pathname: '/read/new', params: { mode: 'audio' } })}
          style={{ flex: 1 }}
        />
      </Row>
      {texts.length === 0 ? (
        <Empty
          icon="book-outline"
          title="Read real texts"
          body="Paste an article, song lyrics, or a story, have AI write one with your words, or transcribe a podcast episode. You'll see how much you can read and can tap any word for its meaning."
        />
      ) : (
        texts.map((x) => {
          const c = stats?.get(x.id);
          return (
            <Pressable key={x.id} onPress={() => router.push({ pathname: '/read/[id]', params: { id: x.id } })}>
              <Card>
                <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                  <View style={{ flex: 1, gap: space.xs }}>
                    <T variant="heading" numberOfLines={1}>
                      {x.title}
                    </T>
                    <T variant="muted" numberOfLines={2}>
                      {x.body}
                    </T>
                  </View>
                  {x.source === 'ai' && <Ionicons name="sparkles" size={16} color={t.textMuted} />}
                  {x.source === 'audio' && <Ionicons name="headset" size={16} color={t.textMuted} />}
                </Row>
                {c && (
                  <>
                    <CoverageBar ratio={c.ratio} />
                    <T variant="small">
                      {c.total} words · {c.unknown.length} new
                    </T>
                  </>
                )}
              </Card>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}
