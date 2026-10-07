import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Row, T } from '@/components/ui';
import { space, useTheme, useWideLayout } from '@/constants/theme';

const greetings: Record<string, string> = { es: 'hola', fr: 'bonjour', de: 'hallo', it: 'ciao', pt: 'olá', hr: 'bok' };

export function WelcomeCard({ lang, language, ready, loading, onStarter, onAdd }: {
  lang: string; language: string; ready: boolean; loading: boolean; onStarter: (count: number) => void; onAdd: () => void;
}) {
  const t = useTheme();
  const wide = useWideLayout();
  const [more, setMore] = useState(false);
  return (
    <View style={[styles.welcome, wide && { paddingTop: 24 }]}>
      <T variant="small" style={{ letterSpacing: 2, textTransform: 'uppercase', fontWeight: '600' }}>Your {language} journey</T>
      <T accessibilityRole="header" style={[styles.title, { color: t.text, fontSize: wide ? 42 : 32, lineHeight: wide ? 50 : 39 }]}>
        Make {language} part of your day.
      </T>
      <T variant="muted" style={styles.intro}>Start with the words you know.{ '\n' }Build from there.</T>
      <View accessible={false} aria-hidden style={styles.illustration}>
        <View style={[styles.flashcard, { backgroundColor: t.primarySoft, borderColor: t.primaryBorder, transform: [{ rotate: '-10deg' }], left: 13, top: 8 }]}>
          <T style={{ color: t.primary, fontSize: 24, fontWeight: '600' }}>{greetings[lang] ?? 'words'}</T>
        </View>
        <View style={[styles.flashcard, { backgroundColor: t.accentSoft, borderColor: t.border, transform: [{ rotate: '9deg' }], right: 13, top: 18 }]}>
          <T style={{ color: t.text, fontSize: 24, fontWeight: '600' }}>{greetings[lang] ? 'hello' : 'meaning'}</T>
        </View>
      </View>
      <Card style={{ width: '100%', maxWidth: 460, gap: space.lg }}>
        <T variant="heading">Find your starting point</T>
        <T variant="muted">A quick placement test finds the words you already know.</T>
        <Button title="Find my level" icon="arrow-forward" onPress={() => router.push('/placement')} disabled={!ready} />
        <T variant="small" style={{ textAlign: 'center' }}>About 2 minutes · At your own pace</T>
        <Button variant="outline" title={loading ? 'Loading your dictionary…' : 'Start with 25 words'} disabled={!ready} onPress={() => onStarter(25)} />
        {!loading && !ready && <T variant="small">Import a dictionary for {language} to use placement and starter words. You can also add your own words below.</T>}
      </Card>
      <Row style={{ justifyContent: 'center' }}>
        <Button compact variant="ghost" title="Add my own words" icon="add" onPress={onAdd} />
        <Button compact variant="ghost" title="Import a dictionary" onPress={() => router.push('/dictionaries')} />
      </Row>
      <Button compact variant="ghost" title={more ? 'Fewer options' : 'More starting options'} accessibilityExpanded={more} onPress={() => setMore(!more)} />
      {more && <Button variant="secondary" title="Start with 100 words" disabled={!ready} onPress={() => onStarter(100)} />}
      <T variant="small" style={{ textAlign: 'center', paddingBottom: space.lg }}>Words that stay with you.</T>
    </View>
  );
}
const styles = StyleSheet.create({
  welcome: { alignItems: 'center', gap: 14, paddingTop: 16 },
  title: { fontWeight: '700', letterSpacing: -1.2, textAlign: 'center', maxWidth: 550 },
  intro: { textAlign: 'center', fontSize: 17, lineHeight: 25 },
  illustration: { width: 240, height: 130, marginTop: 2, marginBottom: 8 },
  flashcard: { position: 'absolute', width: 112, height: 104, borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
});
