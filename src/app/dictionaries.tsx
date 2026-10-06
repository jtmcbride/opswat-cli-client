import { useState } from 'react';
import { Switch, View } from 'react-native';

import { Button, Card, Input, Row, Screen, T } from '@/components/ui';
import { space, useTheme } from '@/constants/theme';
import { useDictionary } from '@/hooks/useDictionary';
import { BUILTIN_LANGUAGES } from '@/data';
import { pickTextFile } from '@/lib/files';
import { parseDictionary, type ParseResult } from '@/lib/importParser';
import { languageName, useStore } from '@/store/useStore';

export default function DictionariesScreen() {
  const t = useTheme();
  const lang = useStore((s) => s.settings.activeLang);
  const custom = useStore((s) => s.customLanguages);
  const allDicts = useStore((s) => s.userDicts);
  const importDictionary = useStore((s) => s.importDictionary);
  const toggleUserDict = useStore((s) => s.toggleUserDict);
  const removeUserDict = useStore((s) => s.removeUserDict);
  const { index, sentences, sources } = useDictionary(lang);
  const builtin = BUILTIN_LANGUAGES.some((l) => l.code === lang);
  const dicts = allDicts.filter((d) => d.lang === lang);

  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const preview = (value: string) => {
    setText(value);
    setParsed(value.trim() ? parseDictionary(value) : null);
    setMessage(null);
  };

  const pickFile = async () => {
    const file = await pickTextFile();
    if (!file) return;
    setName(file.name.replace(/\.[^.]+$/, ''));
    preview(file.text);
  };

  const save = async () => {
    if (!parsed?.entries.length) return;
    setBusy(true);
    await importDictionary(lang, name.trim() || 'My dictionary', parsed.entries);
    setBusy(false);
    setMessage(`Imported ${parsed.entries.length} entries.`);
    setText('');
    setName('');
    setParsed(null);
  };

  return (
    <Screen edges={['bottom']}>
      <T variant="title">{languageName(lang, custom)}</T>

      <Card>
        <T variant="heading">Built-in</T>
        {builtin ? (
          <>
            <T variant="muted">
              {index ? `${index.size} words · ${sentences.length} example sentences (incl. imported and AI)` : 'Loading…'}
            </T>
            {sources.map((s) => (
              <T key={s} variant="small">
                {s}
              </T>
            ))}
          </>
        ) : (
          <T variant="muted">No built-in dictionary for this language. Import one below.</T>
        )}
      </Card>

      {dicts.map((d) => (
        <Card key={d.id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <T variant="heading">{d.name}</T>
              <T variant="muted">{d.count} entries</T>
            </View>
            <Switch value={d.enabled} onValueChange={() => toggleUserDict(d.id)} />
          </Row>
          <Button compact variant="ghost" title="Remove" onPress={() => removeUserDict(d.id)} style={{ alignSelf: 'flex-start' }} />
        </Card>
      ))}

      <Card>
        <T variant="heading">Import a dictionary</T>
        <T variant="muted">
          CSV, TSV, or JSON with a word and its meaning on each line, e.g. “casa,house”. Anki text exports work too. Entries
          are ordered by how common they are, so put the most frequent words first.
        </T>
        <Button variant="secondary" icon="document" title="Choose file" onPress={pickFile} />
        <Input multiline value={text} onChangeText={preview} placeholder={'…or paste here\ncasa\thouse\nperro\tdog'} />
        <Input placeholder="Dictionary name" value={name} onChangeText={setName} />
        {parsed && (
          <View style={{ gap: space.xs }}>
            <T style={{ color: parsed.entries.length ? t.success : t.danger }}>
              {parsed.entries.length} entries found{parsed.skipped ? ` · ${parsed.skipped} lines skipped` : ''}
            </T>
            {parsed.entries.slice(0, 3).map((e, i) => (
              <T key={i} variant="small">
                {e.lemma} — {e.gloss}
              </T>
            ))}
          </View>
        )}
        <Button title="Import" onPress={save} loading={busy} disabled={!parsed?.entries.length} />
        {message && <T variant="muted">{message}</T>}
      </Card>
    </Screen>
  );
}
