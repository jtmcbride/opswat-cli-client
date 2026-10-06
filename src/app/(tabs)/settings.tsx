import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform } from 'react-native';

import { Button, Card, Chip, Input, Row, Screen, T } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { useApiKey } from '@/hooks/useApiKey';
import { DEFAULT_MODEL } from '@/lib/ai';
import { pickTextFile, shareText } from '@/lib/files';
import type { ReviewDirection } from '@/lib/types';
import { languageName, useStore, type Backup } from '@/store/useStore';
import { loadDictEntries } from '@/store/userDicts';

const DIRECTIONS: { value: ReviewDirection; label: string }[] = [
  { value: 'target', label: 'Word → meaning' },
  { value: 'native', label: 'Meaning → word' },
  { value: 'mixed', label: 'Mixed' },
];

function confirm(message: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(message)) onYes();
    return;
  }
  Alert.alert('Are you sure?', message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'OK', style: 'destructive', onPress: onYes },
  ]);
}

export default function SettingsScreen() {
  const t = useTheme();
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const custom = useStore((s) => s.customLanguages);
  const restore = useStore((s) => s.restore);
  const [apiKey, saveApiKey] = useApiKey();
  const [keyDraft, setKeyDraft] = useState('');
  const [native, setNative] = useState(settings.nativeLang);
  const [model, setModel] = useState(settings.aiModel);
  const [message, setMessage] = useState<string | null>(null);

  const exportBackup = async () => {
    const s = useStore.getState();
    const dictEntries = Object.fromEntries(
      await Promise.all(s.userDicts.map(async (d) => [d.id, await loadDictEntries(d.id)] as const)),
    );
    const backup: Backup = {
      version: 1,
      settings: s.settings,
      customLanguages: s.customLanguages,
      words: s.words,
      userDicts: s.userDicts,
      extraSentences: s.extraSentences,
      chats: s.chats,
      dictEntries,
    };
    await shareText(`lingo-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup));
  };

  const importBackup = async () => {
    const file = await pickTextFile();
    if (!file) return;
    try {
      const data = JSON.parse(file.text) as Backup;
      if (data.version !== 1 || !Array.isArray(data.words)) throw new Error('Not a Lingo backup file');
      confirm(`Replace all current data with ${data.words.length} words from the backup?`, () => {
        restore(data);
        setMessage('Backup restored.');
      });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not read backup');
    }
  };

  return (
    <Screen>
      <Card>
        <T variant="heading">Language</T>
        <Row style={{ justifyContent: 'space-between' }}>
          <T>Learning: {languageName(settings.activeLang, custom)}</T>
          <Link href="/languages" asChild>
            <Button compact variant="secondary" title="Change" />
          </Link>
        </Row>
        <T variant="small">Your native language (used for meanings and AI translations)</T>
        <Input value={native} onChangeText={setNative} onBlur={() => setSettings({ nativeLang: native.trim() || 'English' })} />
        <Link href="/dictionaries" asChild>
          <Button variant="secondary" icon="book" title="Manage dictionaries" />
        </Link>
      </Card>

      <Card>
        <T variant="heading">Flashcards</T>
        <Row>
          {DIRECTIONS.map((d) => (
            <Chip
              key={d.value}
              label={d.label}
              selected={settings.reviewDirection === d.value}
              onPress={() => setSettings({ reviewDirection: d.value })}
            />
          ))}
        </Row>
      </Card>

      <Card>
        <T variant="heading">AI tutor</T>
        <T variant="muted">
          Optional. Powers the Chat tab and generates new practice sentences. Uses your own Anthropic API key, which is
          stored only on this device and sent only to Anthropic.
        </T>
        {apiKey ? (
          <Row style={{ justifyContent: 'space-between' }}>
            <T>Key saved (…{apiKey.slice(-4)})</T>
            <Button compact variant="danger" title="Remove" onPress={() => saveApiKey(null)} />
          </Row>
        ) : (
          <>
            <Input placeholder="sk-ant-…" value={keyDraft} onChangeText={setKeyDraft} secureTextEntry />
            <Button
              title="Save key"
              disabled={!keyDraft.trim()}
              onPress={async () => {
                await saveApiKey(keyDraft.trim());
                setKeyDraft('');
              }}
            />
          </>
        )}
        <T variant="small">Model</T>
        <Input value={model} onChangeText={setModel} onBlur={() => setSettings({ aiModel: model.trim() || DEFAULT_MODEL })} />
      </Card>

      <Card>
        <T variant="heading">Backup</T>
        <T variant="muted">Everything is stored on this device. Export a backup to move your words to another device.</T>
        <Row>
          <Button compact variant="secondary" icon="download" title="Export" onPress={exportBackup} />
          <Button compact variant="secondary" icon="cloud-upload" title="Import" onPress={importBackup} />
        </Row>
        {message && <T style={{ color: t.textMuted }}>{message}</T>}
      </Card>
    </Screen>
  );
}
