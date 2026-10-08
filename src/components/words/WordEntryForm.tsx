import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Card, Chip, Input, Row, T } from '@/components/ui';
import { space, useTheme } from '@/constants/theme';
import type { DictIndex } from '@/lib/dictionary';
import { normalize } from '@/lib/tokenize';
import { useStore } from '@/store/useStore';

export function WordEntryForm({ lang, index, onClose, onMessage }: {
  lang: string;
  index: DictIndex | null;
  onClose: () => void;
  onMessage: (message: string) => void;
}) {
  const t = useTheme();
  const addWord = useStore((s) => s.addWord);
  const addWords = useStore((s) => s.addWords);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [word, setWord] = useState('');
  const [gloss, setGloss] = useState('');
  const [glossTouched, setGlossTouched] = useState(false);
  const [bulk, setBulk] = useState('');
  const suggestions = index && word.trim() ? index.search(word, 6).filter((e) => normalize(e.lemma) !== normalize(word)) : [];

  const add = (display: string, meaning: string) => {
    const added = addWord(lang, display, meaning);
    onMessage(added ? `Added “${display}” to your words.` : `“${display}” is already in your words.`);
    setWord('');
    setGloss('');
    setGlossTouched(false);
  };
  const submit = () => {
    if (!word.trim()) return;
    const entry = index?.lookup(word.trim());
    const display = entry && normalize(entry.lemma) !== normalize(word.trim()) && !glossTouched ? entry.lemma : word.trim();
    add(display, gloss || entry?.gloss || '');
  };
  const submitBulk = () => {
    const items = bulk.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
      const [w, g] = line.split(/\t| = | - |;|,/).map((s) => s.trim());
      const entry = index?.lookup(w);
      return { word: entry && !g ? entry.lemma : w, gloss: g || entry?.gloss || '' };
    });
    const count = addWords(lang, items);
    onMessage(`Added ${count} of ${items.length} words.`);
    setBulk('');
  };
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="heading">Add to your vocabulary</T>
        <Button compact variant="ghost" title="Close" icon="close" onPress={onClose} />
      </Row>
      <Row>
        <Chip label="Single word" selected={mode === 'single'} onPress={() => setMode('single')} />
        <Chip label="Bulk import" selected={mode === 'bulk'} onPress={() => setMode('bulk')} />
      </Row>
      {mode === 'single' ? (
        <>
          <View style={{ gap: space.sm }}>
            <T style={{ fontWeight: '600', fontSize: 14 }}>Word</T>
            <Input autoFocus accessibilityLabel="Word" placeholder="A word you want to remember" value={word}
              onChangeText={(value) => { setWord(value); if (!glossTouched) setGloss(index?.lookup(value)?.gloss ?? ''); }}
              onSubmitEditing={submit} returnKeyType="done" />
          </View>
          {suggestions.length > 0 && (
            <View style={{ backgroundColor: t.surfaceAlt, borderRadius: 12, padding: 4 }}>
              {suggestions.map((entry) => (
                <Pressable key={entry.lemma} accessibilityRole="button" accessibilityLabel={`Add ${entry.lemma}, ${entry.gloss}`}
                  onPress={() => add(entry.lemma, entry.gloss)}
                  style={({ pressed }) => ({ padding: 10, minHeight: 44, borderRadius: 8, backgroundColor: pressed ? t.primarySoft : 'transparent' })}>
                  <T style={{ fontWeight: '600' }}>{entry.lemma}</T>
                  <T variant="small" numberOfLines={2}>{entry.gloss}</T>
                </Pressable>
              ))}
            </View>
          )}
          <View style={{ gap: space.sm }}>
            <T style={{ fontWeight: '600', fontSize: 14 }}>Meaning</T>
            <Input accessibilityLabel="Meaning" placeholder="Auto-filled when a dictionary match is available" value={gloss}
              onChangeText={(value) => { setGloss(value); setGlossTouched(true); }} onSubmitEditing={submit} />
          </View>
          <Button title="Add word" icon="add" onPress={submit} disabled={!word.trim()} />
        </>
      ) : (
        <>
          <T variant="muted">One word per line. Add a meaning with a dash, or let the dictionary fill it in.</T>
          <T style={{ fontWeight: '600', fontSize: 14 }}>Words to import</T>
          <Input multiline accessibilityLabel="Words to import" value={bulk} onChangeText={setBulk} placeholder={'casa - house\nperro - dog'} />
          <Button title="Add all words" icon="add" onPress={submitBulk} disabled={!bulk.trim()} />
        </>
      )}
    </Card>
  );
}
