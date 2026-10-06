import { useState } from 'react';
import { View } from 'react-native';

import { Button, T } from '@/components/ui';
import { space, useTheme } from '@/constants/theme';
import { inflectionsFor } from '@/data';
import { groupInflections, type InflectionSection } from '@/lib/grammar';
import type { LangCode } from '@/lib/types';

/** Conjugation / declension tables for a word, loaded on demand. */
export function InflectionTables({ lang, lemma, pos }: { lang: LangCode; lemma: string; pos?: string }) {
  const t = useTheme();
  const [sections, setSections] = useState<InflectionSection[] | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const label = pos === 'v' ? 'Show conjugation' : 'Show all forms';

  const load = async () => {
    setLoading(true);
    const forms = await inflectionsFor(lang, lemma);
    setSections(forms?.length ? groupInflections(lang, forms) : null);
    setLoading(false);
  };

  if (sections === undefined) return <Button compact variant="secondary" icon="grid-outline" title={label} loading={loading} onPress={load} />;
  if (sections === null) return <T variant="small">No inflection table available for this word.</T>;
  return (
    <View style={{ gap: space.lg }}>
      {sections.map((s) => (
        <View key={s.title} style={{ gap: space.xs }}>
          <T style={{ fontWeight: '600' }}>{s.title}</T>
          {s.rows.map((r) => (
            <View
              key={r.label}
              style={{ flexDirection: 'row', gap: space.md, paddingVertical: 2, borderBottomWidth: 1, borderColor: t.surfaceAlt }}>
              <T variant="muted" style={{ width: 130 }}>
                {r.label}
              </T>
              <T style={{ flex: 1 }}>{r.forms.join(' / ')}</T>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
