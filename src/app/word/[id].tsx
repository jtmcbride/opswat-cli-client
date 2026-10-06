import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Switch } from 'react-native';

import { SpeakButton } from '@/components/SpeakButton';
import { Button, Card, Input, Row, Screen, T } from '@/components/ui';
import { InflectionTables } from '@/components/InflectionTables';
import { SayIt } from '@/components/SayIt';
import { useDictionary } from '@/hooks/useDictionary';
import { withArticle } from '@/lib/grammar';
import { isLeech } from '@/lib/srs';
import type { SrsState } from '@/lib/types';
import { useStore } from '@/store/useStore';

const POS_NAMES: Record<string, string> = {
  n: 'noun',
  v: 'verb',
  adj: 'adjective',
  adv: 'adverb',
  pron: 'pronoun',
  prep: 'preposition',
  conj: 'conjunction',
  det: 'determiner',
  art: 'article',
  intj: 'interjection',
  num: 'number',
  part: 'particle',
};

function formatDue(ms: number) {
  const days = Math.round((ms - Date.now()) / 86400000);
  if (days <= 0) return 'now';
  return days === 1 ? 'tomorrow' : `in ${days} days`;
}

function CardStats({ label, srs }: { label: string; srs: SrsState | undefined }) {
  return (
    <T variant="small">
      <T variant="small" style={{ fontWeight: '600' }}>
        {label}:{' '}
      </T>
      {!srs || srs.state === 'new'
        ? 'not reviewed yet'
        : `reviewed ${srs.reps}× · forgotten ${srs.lapses}× · next ${formatDue(srs.due)} · remembered for ~${
            srs.stability < 1 ? '<1 day' : `${Math.round(srs.stability)} days`
          } · difficulty ${Math.round(srs.difficulty)}/10`}
    </T>
  );
}

export default function EditWordScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const word = useStore((s) => s.words.find((w) => w.id === id));
  const updateWord = useStore((s) => s.updateWord);
  const removeWord = useStore((s) => s.removeWord);
  const [text, setText] = useState(word?.word ?? '');
  const [gloss, setGloss] = useState(word?.gloss ?? '');
  const { index } = useDictionary(word?.lang ?? '');
  const entry = word && index ? index.lookup(word.word) : undefined;

  if (!word) {
    return (
      <Screen>
        <T variant="muted">This word no longer exists.</T>
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      {entry && (
        <Card>
          <T variant="heading">{withArticle(word.lang, entry.lemma, entry.gender)}</T>
          {entry.pos && <T variant="small">{POS_NAMES[entry.pos] ?? entry.pos}</T>}
          {['v', 'n', 'adj', 'pron', 'det', 'art'].includes(entry.pos ?? '') && (
            <InflectionTables lang={word.lang} lemma={entry.lemma} pos={entry.pos} />
          )}
        </Card>
      )}
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T variant="small">Word</T>
          <SpeakButton text={text} lang={word.lang} />
        </Row>
        <Input value={text} onChangeText={setText} />
        <SayIt target={word.word} lang={word.lang} compact />
        <T variant="small">Meaning</T>
        <Input value={gloss} onChangeText={setGloss} />
        <CardStats label="Recognition (word → meaning)" srs={word.srs} />
        <CardStats label="Production (meaning → word)" srs={word.produce} />
        {(isLeech(word.srs) || (word.produce && isLeech(word.produce))) && (
          <T variant="small">This word keeps slipping. A memory hook in its meaning (e.g. a similar-sounding English word) often helps.</T>
        )}
        <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
          <T style={{ flex: 1 }}>Suspended (skip in reviews)</T>
          <Switch value={!!word.suspended} onValueChange={(v) => updateWord(word.id, { suspended: v })} />
        </Row>
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
