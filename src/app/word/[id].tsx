import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { SpeakButton } from '@/components/SpeakButton';
import { Button, Card, Input, Row, Screen, T } from '@/components/ui';
import { useStore } from '@/store/useStore';

function formatDue(ms: number) {
  const days = Math.round((ms - Date.now()) / 86400000);
  if (days <= 0) return 'now';
  return days === 1 ? 'tomorrow' : `in ${days} days`;
}

export default function EditWordScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const word = useStore((s) => s.words.find((w) => w.id === id));
  const updateWord = useStore((s) => s.updateWord);
  const removeWord = useStore((s) => s.removeWord);
  const [text, setText] = useState(word?.word ?? '');
  const [gloss, setGloss] = useState(word?.gloss ?? '');

  if (!word) {
    return (
      <Screen>
        <T variant="muted">This word no longer exists.</T>
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T variant="small">Word</T>
          <SpeakButton text={text} lang={word.lang} />
        </Row>
        <Input value={text} onChangeText={setText} />
        <T variant="small">Meaning</T>
        <Input value={gloss} onChangeText={setGloss} />
        <T variant="small">
          Reviewed {word.srs.reps} times · next review {formatDue(word.srs.due)}
        </T>
      </Card>
      <Row>
        <Button
          title="Save"
          style={{ flex: 1 }}
          disabled={!text.trim()}
          onPress={() => {
            updateWord(word.id, { word: text.trim(), gloss: gloss.trim() });
            router.back();
          }}
        />
        <Button
          title="Delete"
          variant="danger"
          style={{ flex: 1 }}
          onPress={() => {
            removeWord(word.id);
            router.back();
          }}
        />
      </Row>
    </Screen>
  );
}
