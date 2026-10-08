import { useState } from 'react';

import { Button, Card, Chip, Input, Row, T } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { useOpenAiKey } from '@/hooks/useApiKey';
import { useLocalModel } from '@/hooks/useLocalModel';
import { confirm } from '@/lib/confirm';
import { prepareModel, removeModel, type LocalModel } from '@/lib/localTranscribe';
import { useStore } from '@/store/useStore';

const MODELS: { id: LocalModel; label: string; about: string }[] = [
  { id: 'fast', label: 'Fast', about: 'Smaller download (roughly 80–150 MB); good for clear speech.' },
  { id: 'accurate', label: 'Accurate', about: 'Larger download (roughly 250–350 MB); better with fast or noisy speech.' },
];

/** Settings → Audio transcription: OpenAI with the learner's key, or Whisper on this device. */
export function TranscriptionSettings() {
  const t = useTheme();
  const engine = useStore((s) => s.settings.transcriptionEngine);
  const setSettings = useStore((s) => s.setSettings);
  const [openAiKey, saveOpenAiKey] = useOpenAiKey();
  const [draft, setDraft] = useState('');
  const local = useLocalModel();
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const download = async (model: LocalModel) => {
    setError(null);
    try {
      await prepareModel(model, (message, fraction) =>
        setProgress(fraction != null ? `${message} ${Math.round(fraction * 100)}%` : message),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setProgress(null);
      await local.refresh();
    }
  };

  const remove = (model: LocalModel) =>
    confirm('Remove the downloaded speech model? You can download it again later.', async () => {
      await removeModel(model);
      await local.refresh();
    });

  const canLocal = !!local.support?.supported;

  return (
    <Card>
      <T variant="heading">Audio transcription</T>
      <T variant="muted">
        Optional. Turns podcast episodes and other recordings into texts you can read along with.
      </T>
      {canLocal && (
        <Row>
          <Chip label="OpenAI" selected={engine === 'openai'} onPress={() => setSettings({ transcriptionEngine: 'openai' })} />
          <Chip label="On this device" selected={engine === 'local'} onPress={() => setSettings({ transcriptionEngine: 'local' })} />
        </Row>
      )}

      {engine === 'local' && canLocal ? (
        <>
          <T variant="muted">
            Free and private: audio never leaves this device. The speech model downloads once and stays in this browser.
            {local.support?.webgpu
              ? ' This browser can use your graphics card, so transcription is fast.'
              : ' This browser has no WebGPU, so transcription runs on the processor and can take longer than the audio itself.'}
          </T>
          {MODELS.map((m) => (
            <Row key={m.id} style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
              <Chip label={m.label} selected={local.model === m.id} onPress={() => setSettings({ localModel: m.id })} />
              <T variant="small" style={{ flex: 1 }}>
                {m.about}
                {m.id === local.recommended ? ' Recommended for this device.' : ''}
                {local.downloaded[m.id] ? ' Downloaded.' : ''}
              </T>
            </Row>
          ))}
          {local.downloaded[local.model] ? (
            <Button variant="ghost" title="Remove downloaded model" onPress={() => remove(local.model)} />
          ) : (
            <Button
              variant="secondary"
              icon="cloud-download-outline"
              title="Download model now"
              loading={!!progress}
              onPress={() => download(local.model)}
            />
          )}
          {progress && <T variant="small">{progress}</T>}
          {error && <T style={{ color: t.danger }}>{error}</T>}
        </>
      ) : (
        <>
          <T variant="muted">
            Uses your own OpenAI API key, which is stored only on this device. Audio you transcribe is sent to OpenAI.
          </T>
          {openAiKey ? (
            <Row style={{ justifyContent: 'space-between' }}>
              <T>Key saved (…{openAiKey.slice(-4)})</T>
              <Button compact variant="danger" title="Remove" onPress={() => saveOpenAiKey(null)} />
            </Row>
          ) : (
            <>
              <Input accessibilityLabel="OpenAI API key" placeholder="sk-…" value={draft} onChangeText={setDraft} secureTextEntry />
              <Button
                title="Save key"
                disabled={!draft.trim()}
                onPress={async () => {
                  await saveOpenAiKey(draft.trim());
                  setDraft('');
                }}
              />
            </>
          )}
        </>
      )}
    </Card>
  );
}
