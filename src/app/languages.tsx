import { router } from 'expo-router';
import { useState } from 'react';

import { Button, Card, Chip, Input, Row, Screen, T } from '@/components/ui';
import { useStore, useLanguages } from '@/store/useStore';

export default function LanguagesScreen() {
  const active = useStore((s) => s.settings.activeLang);
  const setSettings = useStore((s) => s.setSettings);
  const addCustomLanguage = useStore((s) => s.addCustomLanguage);
  const languages = useLanguages();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const choose = (c: string) => {
    setSettings({ activeLang: c });
    router.back();
  };

  const add = () => {
    const c = (code.trim() || name.trim().slice(0, 3)).toLowerCase();
    if (!c || !name.trim()) return;
    addCustomLanguage({ code: c, name: name.trim() });
    setSettings({ activeLang: c });
    router.replace('/dictionaries');
  };

  return (
    <Screen edges={['bottom']}>
      <T variant="heading">I&apos;m learning</T>
      <Row>
        {languages.map((l) => (
          <Chip key={l.code} label={l.name} selected={l.code === active} onPress={() => choose(l.code)} />
        ))}
      </Row>
      <Card>
        <T variant="heading">Another language</T>
        <T variant="muted">Add any language, then import a dictionary for it. AI chat and sentence generation work for any language.</T>
        <Input placeholder="Name (e.g. Japanese)" value={name} onChangeText={setName} autoCapitalize="words" />
        <Input placeholder="Code (e.g. ja)" value={code} onChangeText={setCode} />
        <Button title="Add language" onPress={add} disabled={!name.trim()} />
      </Card>
    </Screen>
  );
}
