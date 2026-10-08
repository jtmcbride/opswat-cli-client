import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';

import { PodcastPicker } from '@/components/PodcastPicker';
import { Button, Card, Chip, Input, Row, Screen, T } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { useApiKey, useOpenAiKey } from '@/hooks/useApiKey';
import { generateStory } from '@/lib/ai';
import { saveAudio } from '@/lib/audioStore';
import { pickAudioFile, pickTextFile } from '@/lib/files';
import type { AudioInput } from '@/lib/transcribe';
import { MAX_EPISODE_BYTES, transcribeLong } from '@/lib/transcribeLong';
import { transcribeLocal } from '@/lib/localTranscribe';
import { useLocalModel } from '@/hooks/useLocalModel';
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
  const [audioSource, setAudioSource] = useState<'file' | 'link'>('file');
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);
  const [progress, setProgress] = useState<string | null>(null);
  const engine = settings.transcriptionEngine;
  const local = useLocalModel();
  const onDevice = engine === 'local' && !!local.support?.supported;
  const cancelRef = useRef<AbortController | null>(null);

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
    setAudioUrl(undefined);
    setTitle(file.name.replace(/\.[^.]+$/, ''));
  };

  const pickEpisode = (file: AudioInput, episodeTitle: string, url: string) => {
    setError(null);
    setAudio(file);
    setAudioUrl(url);
    setTitle(episodeTitle);
  };

  const transcribe = async () => {
    if (!audio || (!onDevice && !openAiKey)) return;
    setBusy(true);
    setError(null);
    const controller = new AbortController();
    cancelRef.current = controller;
    try {
      const segments = onDevice
        ? await transcribeLocal({
            audio,
            lang,
            model: local.model,
            signal: controller.signal,
            onProgress: (message, fraction) => setProgress(fraction != null ? `${message} ${Math.round(fraction * 100)}%` : message),
          })
        : await transcribeLong({ apiKey: openAiKey!, audio, lang, onProgress: setProgress });
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
        audioUrl,
      });
      open(text.id);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError(e instanceof Error ? e.message : String(e));
    } finally {
      cancelRef.current = null;
      setBusy(false);
      setProgress(null);
    }
  };

  const tooBig = !!audio?.size && audio.size > MAX_EPISODE_BYTES;

  return (
    <Screen edges={['bottom']}>
      <Row>
        <Chip label="Paste or import" selected={mode === 'paste'} onPress={() => setMode('paste')} />
        <Chip label="AI story" selected={mode === 'ai'} onPress={() => setMode('ai')} />
        <Chip label="Audio" selected={mode === 'audio'} onPress={() => setMode('audio')} />
      </Row>

      {mode === 'audio' ? (
        openAiKey || onDevice ? (
          <Card>
            <T variant="muted">
              Transcribe a podcast episode or other recording in {languageName(lang, custom)}, then read along while it plays.
              {onDevice
                ? ' Transcribed on this device, for free; keep this page open until it finishes.'
                : ' Long MP3 episodes are transcribed in parts. Transcription is billed to your OpenAI account.'}
            </T>
            <Row>
              <Chip label="File" selected={audioSource === 'file'} onPress={() => setAudioSource('file')} />
              <Chip label="Podcast or link" selected={audioSource === 'link'} onPress={() => setAudioSource('link')} />
            </Row>
            {audioSource === 'file' ? (
              <Button
                variant="secondary"
                icon="musical-notes"
                title={audio ? 'Choose a different file' : 'Choose audio file'}
                onPress={pickAudio}
              />
            ) : (
              <PodcastPicker lang={lang} onPicked={pickEpisode} />
            )}
            {audio && (
              <T variant="small">
                {audio.name}
                {audio.size ? ` · ${(audio.size / 1024 / 1024).toFixed(1)} MB` : ''}
              </T>
            )}
            {tooBig && <T style={{ color: t.danger }}>This file is over the {MAX_EPISODE_BYTES / 1024 / 1024} MB limit.</T>}
            {audio && (
              <Input accessibilityLabel="Title" placeholder="Title (optional)" value={title} onChangeText={setTitle} autoCapitalize="sentences" />
            )}
            <Button title="Transcribe" icon="mic" onPress={transcribe} loading={busy} disabled={!audio || tooBig} />
            {busy && progress && <T variant="small">{progress} This can take a few minutes for a long episode.</T>}
            {busy && onDevice && <Button variant="ghost" title="Cancel" onPress={() => cancelRef.current?.abort()} />}
            {error && <T style={{ color: t.danger }}>{error}</T>}
          </Card>
        ) : (
          <Card>
            <T variant="muted">
              Transcribing audio needs an OpenAI API key{local.support?.supported ? ', or switch to on-device transcription' : ''}.
            </T>
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
