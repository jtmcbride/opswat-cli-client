import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Switch } from 'react-native';

import { SpeakButton } from '@/components/SpeakButton';
import { Button, Card, Chip, Input, Row, Screen, T } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { starterDictionary } from '@/data';
import { useApiKey } from '@/hooks/useApiKey';
import { useCanSpeak } from '@/hooks/useSpeech';
import { DEFAULT_MODEL } from '@/lib/ai';
import { pickTextFile, shareText } from '@/lib/files';
import { remindersSupported, scheduleDailyReminder } from '@/lib/reminders';
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
  const canSpeak = useCanSpeak(settings.activeLang);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const setReminder = async (time: { hour: number; minute: number } | null) => {
    setReminderError(null);
    const ok = await scheduleDailyReminder(time);
    if (ok) setSettings({ reminder: time });
    else setReminderError('Notifications are turned off for this app. Enable them in your device settings.');
  };
  const sample = starterDictionary(settings.activeLang)?.sentences[0]?.text ?? languageName(settings.activeLang, custom);

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
      texts: s.texts,
      activity: s.activity,
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
        <Link href="/placement" asChild>
          <Button variant="secondary" icon="school-outline" title="Placement test" />
        </Link>
      </Card>

      <Card>
        <T variant="heading">Flashcards</T>
        <Row>
          <Chip
            label="Mixed exercises"
            selected={settings.reviewStyle === 'mixed'}
            onPress={() => setSettings({ reviewStyle: 'mixed' })}
          />
          <Chip label="Flip cards only" selected={settings.reviewStyle === 'flip'} onPress={() => setSettings({ reviewStyle: 'flip' })} />
        </Row>
        <T variant="small">
          Mixed: new words start as flip cards, then you recall them by typing the word, filling a sentence blank, or
          writing what you hear.
        </T>
        {settings.reviewStyle === 'mixed' && canSpeak && (
          <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <T style={{ flex: 1 }}>Include listening exercises</T>
            <Switch value={settings.listening} onValueChange={(v) => setSettings({ listening: v })} />
          </Row>
        )}
        <T variant="small">Daily review goal</T>
        <Row>
          {[10, 20, 50, 100].map((n) => (
            <Chip key={n} label={String(n)} selected={settings.dailyGoal === n} onPress={() => setSettings({ dailyGoal: n })} />
          ))}
        </Row>
        {remindersSupported && (
          <>
            <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              <T style={{ flex: 1 }}>Daily reminder</T>
              <Switch value={!!settings.reminder} onValueChange={(on) => setReminder(on ? settings.reminder ?? { hour: 19, minute: 0 } : null)} />
            </Row>
            {settings.reminder && (
              <Row>
                {[8, 12, 19, 21].map((h) => (
                  <Chip
                    key={h}
                    label={`${h}:00`}
                    selected={settings.reminder?.hour === h}
                    onPress={() => setReminder({ hour: h, minute: 0 })}
                  />
                ))}
              </Row>
            )}
            {reminderError && <T style={{ color: t.danger }}>{reminderError}</T>}
          </>
        )}
        <T variant="small">New words per day</T>
        <Row>
          {[10, 20, 50, 0].map((n) => (
            <Chip
              key={n}
              label={n ? String(n) : 'No limit'}
              selected={settings.dailyNewLimit === n}
              onPress={() => setSettings({ dailyNewLimit: n })}
            />
          ))}
        </Row>
        <T variant="small">Target recall</T>
        <Row>
          {[0.8, 0.85, 0.9, 0.95].map((r) => (
            <Chip
              key={r}
              label={`${Math.round(r * 100)}%`}
              selected={settings.retention === r}
              onPress={() => setSettings({ retention: r })}
            />
          ))}
        </Row>
        <T variant="small">
          Reviews are scheduled (with FSRS) for when you&apos;re this likely to still remember a word. Higher means more
          reviews; 90% is a good balance.
        </T>
        <T variant="small">Flip card direction</T>
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
        <T variant="heading">Pronunciation</T>
        {canSpeak ? (
          <>
            <Row style={{ justifyContent: 'space-between' }}>
              <T>Try it</T>
              <SpeakButton text={sample} lang={settings.activeLang} id="settings-sample" />
            </Row>
            <Row>
              <Chip label="Normal speed" selected={settings.speechRate === 'normal'} onPress={() => setSettings({ speechRate: 'normal' })} />
              <Chip label="Slow" selected={settings.speechRate === 'slow'} onPress={() => setSettings({ speechRate: 'slow' })} />
            </Row>
            <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              <T style={{ flex: 1 }}>Read words aloud on flashcards</T>
              <Switch value={settings.autoSpeak} onValueChange={(v) => setSettings({ autoSpeak: v })} />
            </Row>
            <T variant="small">Uses your device&apos;s voices. Long-press any speaker button to hear it slowly.</T>
          </>
        ) : (
          <T variant="muted">
            No {languageName(settings.activeLang, custom)} voice is available on this device. Install one in your
            system&apos;s text-to-speech or language settings, then reopen the app.
          </T>
        )}
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
