import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Chip, Empty, Row, Screen, T } from '@/components/ui';
import { space, useTheme } from '@/constants/theme';
import { useDictionary, useKnown } from '@/hooks/useDictionary';
import { distractors, seededRandom, shuffle } from '@/lib/picker';
import {
  BANDS,
  CHECKS_PER_BAND,
  estimateVocabulary,
  sampleBand,
  shouldContinue,
  wordsToMark,
  type BandResult,
} from '@/lib/placement';
import { normalize } from '@/lib/tokenize';
import type { DictEntry } from '@/lib/types';
import { languageName, useStore } from '@/store/useStore';

type Phase = { kind: 'pick' } | { kind: 'check'; queue: DictEntry[]; options: string[]; correct: number } | { kind: 'result' };

export default function PlacementScreen() {
  const t = useTheme();
  const lang = useStore((s) => s.settings.activeLang);
  const custom = useStore((s) => s.customLanguages);
  const addWords = useStore((s) => s.addWords);
  const { index } = useDictionary(lang);
  const { lemmas } = useKnown(lang, index);
  const [band, setBand] = useState(0);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<Phase>({ kind: 'pick' });
  const [results, setResults] = useState<BandResult[]>([]);
  const [added, setAdded] = useState<number | null>(null);

  const sample = useMemo(() => {
    if (!index) return [];
    return sampleBand(index.entries, band, seededRandom(seed));
  }, [index, band, seed]);

  const optionsFor = (e: DictEntry) => {
    const random = seededRandom(seed + (e.rank ?? 0));
    return shuffle([e.gloss, ...(index ? distractors(index, e, 3, random) : [])], random);
  };

  const finishBand = (r: BandResult) => {
    const all = [...results, r];
    setResults(all);
    if (shouldContinue(r)) {
      setBand(band + 1);
      setSeed((s) => s + 7919);
      setSelected(new Set());
      setPhase({ kind: 'pick' });
    } else {
      setPhase({ kind: 'result' });
    }
  };

  const submitPick = () => {
    const known = sample.filter((e) => selected.has(e.lemma));
    const queue = shuffle(known, seededRandom(seed + 1)).slice(0, CHECKS_PER_BAND);
    if (!queue.length) return finishBand({ band, shown: sample.length, claimed: 0, checks: 0, checksCorrect: 0 });
    setPhase({ kind: 'check', queue, options: optionsFor(queue[0]), correct: 0 });
  };

  const answer = (option: string) => {
    if (phase.kind !== 'check') return;
    const [current, ...rest] = phase.queue;
    const correct = phase.correct + (option === current.gloss ? 1 : 0);
    if (rest.length) return setPhase({ kind: 'check', queue: rest, options: optionsFor(rest[0]), correct });
    const checks = Math.min(CHECKS_PER_BAND, selected.size);
    finishBand({ band, shown: sample.length, claimed: selected.size, checks, checksCorrect: correct });
  };

  if (!index) {
    return (
      <Screen edges={['bottom']}>
        <T variant="muted">Loading…</T>
      </Screen>
    );
  }

  if (index.entries.length < 500) {
    return (
      <Screen edges={['bottom']}>
        <Empty icon="school-outline" title="Not available" body="The placement test needs a built-in dictionary for this language." />
      </Screen>
    );
  }

  if (phase.kind === 'result') {
    const estimate = estimateVocabulary(results);
    const toMark = wordsToMark(index.entries, results).filter((e) => !lemmas.has(normalize(e.lemma)));
    return (
      <Screen edges={['bottom']}>
        <Card>
          <T variant="small">Estimated vocabulary</T>
          <T variant="big">~{estimate.toLocaleString()} words</T>
          <T variant="muted" style={{ textAlign: 'center' }}>
            of the 5,000 most common {languageName(lang, custom)} words
          </T>
        </Card>
        {added === null ? (
          toMark.length > 0 ? (
            <>
              <T variant="muted">
                Mark {toMark.length} words as known? They won&apos;t be taught as new words; instead they&apos;ll come up for
                an occasional check over the next few weeks so the app can confirm you know them.
              </T>
              <Button
                title={`Mark ${toMark.length} words as known`}
                onPress={() => setAdded(addWords(lang, toMark.map((e) => ({ word: e.lemma, gloss: e.gloss })), { known: true }))}
              />
            </>
          ) : (
            <T variant="muted">No new words to add — start with the Learn tab.</T>
          )
        ) : (
          <T style={{ color: t.success }}>Added {added} words.</T>
        )}
        <Button variant="secondary" title="Done" onPress={() => router.back()} />
      </Screen>
    );
  }

  const [from, to] = BANDS[band];
  return (
    <Screen edges={['bottom']}>
      <T variant="muted">
        Step {band + 1} of up to {BANDS.length} · words ranked {from}–{to} by frequency
      </T>
      {phase.kind === 'pick' ? (
        <Card>
          <T variant="heading">Tap the words you know</T>
          <T variant="small">Only ones you could translate without thinking. We&apos;ll check a couple.</T>
          <Row>
            {sample.map((e) => (
              <Chip
                key={e.lemma}
                label={e.lemma}
                selected={selected.has(e.lemma)}
                onPress={() =>
                  setSelected((s) => {
                    const n = new Set(s);
                    if (n.has(e.lemma)) n.delete(e.lemma);
                    else n.add(e.lemma);
                    return n;
                  })
                }
              />
            ))}
          </Row>
          <Button title={selected.size ? `Next (${selected.size} known)` : 'I know none of these'} onPress={submitPick} />
        </Card>
      ) : (
        <Card>
          <T variant="small">Quick check</T>
          <T variant="big">{phase.queue[0].lemma}</T>
          <View style={{ gap: space.sm }}>
            {phase.options.map((o) => (
              <Button key={o} variant="secondary" title={o} onPress={() => answer(o)} />
            ))}
            <Button variant="ghost" title="Not sure" onPress={() => answer('')} />
          </View>
        </Card>
      )}
    </Screen>
  );
}
