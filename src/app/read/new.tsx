import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button, Card, Chip, Input, Row, Screen, T } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { useApiKey, useOpenAiKey } from '@/hooks/useApiKey';
import { generateStory } from '@/lib/ai';
import { saveAudio } from '@/lib/audioStore';
import { pickAudioFile, pickTextFile } from '@/lib/files';
import { MAX_AUDIO_BYTES, transcribeAudio, type AudioInput } from '@/lib/transcribe';
import { languageName, uid, useStore } from '@/store/useStore';

export default function NewTextScreen() {
  const t = useTheme();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<'paste' | 'ai' | 'audio'>(
    params.mode === 'ai' || params.mode === 'audio' ? params.mode : 'paste',
  );
  const lang = useStore((s) => s.settings.activeLang);
  const settings = useStore((s) => s.settings);
  const custom = useStore((s) => s.customLanguages);
  const allWords = useStore((s) => s.words);
  const addText = useStore((s) => s.addText);
  const [apiKey] = useApiKey();
  const [openAiKey] = useOpenAiKey();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [topic, setTopic] = useState('');
  const [length, setLength] = useState<'short' | 'medium'>('short');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audio, setAudio] = useState<AudioInput | null>(null);

  const open = (id: string) => router.replace({ pathname: '/read/[id]', params: { id } });

  const save = () => {
    const text = addText({ lang, title: title.trim() || body.trim().split('\n')[0].slice(0, 40), body: body.trim(), source: 'user' });
    open(text.id);
  };

  const pickFile = async () => {
    const file = await pickTextFile();
    if (!file) return;
    setTitle(file.name.replace(/\.[^.]+$/, ''));
    setBody(file.text);
  };

  const generate = async () => {
    if (!apiKey) return;
    setBusy(true);
    setError(null);
    try {
      const story = await generateStory({
        apiKey,
        model: settings.aiModel,
        language: languageName(lang, custom),
        nativeLanguage: settings.nativeLang,
        knownWords: allWords.filter((w) => w.lang === lang).map((w) => w.word),
        topic: topic.trim() || undefined,
        length,
      });
      const text = addText({ lang, title: story.title, body: story.text, source: 'ai', glosses: story.glosses });
      open(text.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const pickAudio = async () => {
    const file = await pickAudioFile();
    if (!file) return;
    setError(null);
    setAudio(file);
    setTitle(file.name.replace(/\.[^.]+$/, ''));
  };

  const transcribe = async () => {
    if (!openAiKey || !audio) return;
    setBusy(true);
    setError(null);
    try {
      const segments = await transcribeAudio({ apiKey: openAiKey, audio, lang });
      const id = uid();
      let audioName: string | undefined = audio.name;
      try {
        await saveAudio(id, audio);
      } catch {
        // Keep the transcript even if the audio can't be stored on this device.
        audioName = undefined;
      }
      const text = addText({
        id,
        lang,
        title: title.trim() || audio.name,
        body: segments.map((s) => s.text).join(' '),
        source: 'audio',
        segments,
        audioName,
      });
      open(text.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const tooBig = !!audio?.size && audio.size > MAX_AUDIO_BYTES;

  return (
    <Screen edges={['bottom']}>
      <Row>
        <Chip label="Paste or import" selected={mode === 'paste'} onPress={() => setMode('paste')} />
        <Chip label="AI story" selected={mode === 'ai'} onPress={() => setMode('ai')} />
        <Chip label="Audio" selected={mode === 'audio'} onPress={() => setMode('audio')} />
      </Row>

      {mode === 'audio' ? (
        openAiKey ? (
          <Card>
            <T variant="muted">
              Transcribe a {languageName(lang, custom)} podcast episode or other recording, then read along while it plays.
              Files up to 25 MB (about 25 minutes of a typical podcast).
            </T>
            <Button
              variant="secondary"
              icon="musical-notes"
              title={audio ? 'Choose a different file' : 'Choose audio file'}
              onPress={pickAudio}
            />
            {audio && (
              <T variant="small">
                {audio.name}
                {audio.size ? ` · ${(audio.size / 1024 / 1024).toFixed(1)} MB` : ''}
              </T>
            )}
            {tooBig && <T style={{ color: t.danger }}>This file is over the 25 MB limit. Try a shorter or lower-bitrate file.</T>}
            {audio && (
              <Input accessibilityLabel="Title" placeholder="Title (optional)" value={title} onChangeText={setTitle} autoCapitalize="sentences" />
            )}
            <Button title="Transcribe" icon="mic" onPress={transcribe} loading={busy} disabled={!audio || tooBig} />
            {busy && <T variant="small">Transcribing… this can take a minute or two.</T>}
            {error && <T style={{ color: t.danger }}>{error}</T>}
          </Card>
        ) : (
          <Card>
            <T variant="muted">Transcribing audio needs an OpenAI API key.</T>
            <Button title="Open Settings" onPress={() => router.push('/settings')} />
          </Card>
        )
      ) : mode === 'paste' ? (
        <Card>
          <T variant="muted">Paste any {languageName(lang, custom)} text: an article, lyrics, a chapter, a menu…</T>
          <Button variant="secondary" icon="document" title="Choose text file" onPress={pickFile} />
          <Input placeholder="Title (optional)" value={title} onChangeText={setTitle} autoCapitalize="sentences" />
          <Input
            multiline
            value={body}
            onChangeText={setBody}
            placeholder="Text"
            autoCapitalize="sentences"
            style={{ minHeight: 240 }}
          />
          <Button title="Save and read" onPress={save} disabled={!body.trim()} />
        </Card>
      ) : apiKey ? (
        <Card>
          <T variant="muted">
            A short story written almost entirely with words you know, plus a few new ones you can guess from context.
          </T>
          <Input placeholder="Topic (optional), e.g. a day at the beach" value={topic} onChangeText={setTopic} autoCapitalize="sentences" />
          <Row>
            <Chip label="Short (~100 words)" selected={length === 'short'} onPress={() => setLength('short')} />
            <Chip label="Medium (~250 words)" selected={length === 'medium'} onPress={() => setLength('medium')} />
          </Row>
          <Button title="Write my story" icon="sparkles" onPress={generate} loading={busy} />
          {error && <T style={{ color: t.danger }}>{error}</T>}
        </Card>
      ) : (
        <Card>
          <T variant="muted">AI stories need an Anthropic API key.</T>
          <Button title="Open Settings" onPress={() => router.push('/settings')} />
        </Card>
      )}
    </Screen>
  );
}
