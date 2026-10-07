import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { T } from '@/components/ui';
import { space, useTheme } from '@/constants/theme';

export interface Column {
  key: string;
  /** Short axis label, e.g. "Mon" or "5". */
  label: string;
  /** Full label for the tooltip and table, e.g. "Mon, Oct 5". */
  title: string;
  value: number;
}

const roundUp = (n: number) => {
  if (n <= 5) return 5;
  const step = Math.pow(10, Math.floor(Math.log10(n)));
  return Math.ceil(n / (step / 2)) * (step / 2);
};

/**
 * Single-series column chart: thin columns with rounded tops on one baseline, a recessive axis,
 * an optional goal line, tap-for-value, and a table view for accessibility.
 */
export function ColumnChart({
  data,
  unit,
  goal,
  height = 120,
}: {
  data: Column[];
  unit: string;
  goal?: number;
  height?: number;
}) {
  const t = useTheme();
  const [selected, setSelected] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  // Leave headroom above a goal line so it never sits on the top of the plot.
  const max = roundUp(Math.max(1, (goal ?? 0) * 1.25, ...data.map((d) => d.value)));
  const sel = selected !== null ? data[selected] : null;
  const fmt = (d: Column) => `${d.title}: ${d.value.toLocaleString()} ${unit}`;

  return (
    <View style={{ gap: space.sm }}>
      <T variant="small" style={{ minHeight: 18 }}>
        {sel ? fmt(sel) : 'Tap a column for details'}
      </T>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ height, justifyContent: 'space-between' }}>
          <T variant="small">{max.toLocaleString()}</T>
          <T variant="small">0</T>
        </View>
        <View style={{ flex: 1, height }}>
          <View style={[StyleSheet.absoluteFill, { borderBottomWidth: 1, borderColor: t.border }]} />
          {goal !== undefined && goal > 0 && (
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: (goal / max) * height, borderTopWidth: 1, borderColor: t.textMuted }}>
              <T variant="small" style={{ position: 'absolute', right: 0, top: 2 }}>
                goal {goal}
              </T>
            </View>
          )}
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
            {data.map((d, i) => (
              <Pressable
                key={d.key}
                accessibilityRole="button"
                accessibilityLabel={fmt(d)}
                onPress={() => setSelected(selected === i ? null : i)}
                style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' }}>
                <View
                  style={{
                    width: '70%',
                    maxWidth: 24,
                    height: d.value ? Math.max(2, (d.value / max) * height) : 0,
                    backgroundColor: t.primary,
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                    opacity: selected === null || selected === i ? 1 : 0.4,
                  }}
                />
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 32 }}>
        <T variant="small">{data[0]?.label}</T>
        <T variant="small">{data.at(-1)?.label}</T>
      </View>
      <Pressable onPress={() => setTable(!table)} accessibilityRole="button">
        <T variant="small" style={{ color: t.primary }}>
          {table ? 'Hide table' : 'Show as table'}
        </T>
      </Pressable>
      {table && (
        <View>
          {data.map((d) => (
            <View key={d.key} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
              <T variant="small">{d.title}</T>
              <T variant="small" style={{ color: t.text, fontVariant: ['tabular-nums'] }}>
                {d.value.toLocaleString()}
              </T>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
