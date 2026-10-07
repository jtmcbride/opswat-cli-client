import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { T } from '@/components/ui';
import { radius, space, useTheme } from '@/constants/theme';
import type { CalendarDay } from '@/lib/activity';
import { STRENGTHS, type Strength } from '@/lib/strength';

const STRENGTH_LABEL: Record<Strength, string> = {
  new: 'New',
  learning: 'Learning',
  familiar: 'Familiar',
  mastered: 'Mastered',
};
export const STRENGTH_HELP = 'Familiar: remembered for a week or more. Mastered: three weeks or more.';

/** Part-to-whole bar of words by memory strength, weakest to strongest, with a counted legend. */
export function StrengthBar({ counts, label }: { counts: Record<Strength, number>; label: string }) {
  const t = useTheme();
  const total = STRENGTHS.reduce((s, k) => s + counts[k], 0);
  const shown = STRENGTHS.filter((k) => counts[k] > 0);
  return (
    <View style={{ gap: space.xs }}>
      <T variant="small">{label}</T>
      <View
        accessibilityRole="image"
        accessibilityLabel={`${label}: ${STRENGTHS.map((k) => `${counts[k]} ${STRENGTH_LABEL[k].toLowerCase()}`).join(', ')}`}
        style={{ flexDirection: 'row', height: 14, gap: 2, borderRadius: radius.sm, overflow: 'hidden' }}>
        {total === 0 ? (
          <View style={{ flex: 1, backgroundColor: t.surfaceAlt }} />
        ) : (
          shown.map((k) => <View key={k} style={{ flex: counts[k], backgroundColor: t.ramp[STRENGTHS.indexOf(k)] }} />)
        )}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: space.md, rowGap: 2 }}>
        {STRENGTHS.map((k, i) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: t.ramp[i] }} />
            <T variant="small">
              {STRENGTH_LABEL[k]} <T variant="small" style={{ color: t.text, fontWeight: '600' }}>{counts[k].toLocaleString()}</T>
            </T>
          </View>
        ))}
      </View>
    </View>
  );
}

const WEEKDAYS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

const dayTitle = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

/**
 * Activity calendar: one column per week, one cell per day, shaded by reviews relative to the
 * daily goal (darkest = goal met). Tap a day for its count; a list view gives the same data as text.
 */
export function ActivityCalendar({ weeks, goal }: { weeks: CalendarDay[][]; goal: number }) {
  const t = useTheme();
  const [selected, setSelected] = useState<CalendarDay | null>(null);
  const [list, setList] = useState(false);
  const fill = (level: number) => (level === 0 ? t.surfaceAlt : t.ramp[level - 1]);
  const active = weeks.flat().filter((d) => d.reviews > 0 && !d.future);

  return (
    <View style={{ gap: space.sm }}>
      <T variant="small" style={{ minHeight: 18 }}>
        {selected
          ? `${dayTitle(selected.key)}: ${selected.reviews} review${selected.reviews === 1 ? '' : 's'}${selected.reviews >= goal ? ' · goal met' : ''}`
          : 'Tap a day for details'}
      </T>
      {list ? (
        <View>
          {active.length === 0 && <T variant="muted">No reviews in this period.</T>}
          {[...active].reverse().map((d) => (
            <View key={d.key} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2, borderBottomWidth: 1, borderColor: t.surfaceAlt }}>
              <T variant="muted">{dayTitle(d.key)}</T>
              <T>{d.reviews.toLocaleString()} reviews</T>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 3 }}>
          <View style={{ gap: 3, marginRight: 2 }}>
            {WEEKDAYS.map((w, i) => (
              <View key={i} style={{ flex: 1, justifyContent: 'center', minHeight: 14 }}>
                <T variant="small" style={{ fontSize: 10, lineHeight: 12 }}>
                  {w}
                </T>
              </View>
            ))}
          </View>
          {weeks.map((week) => (
            <View key={week[0].key} style={{ flex: 1, gap: 3 }}>
              {week.map((d) => (
                <Pressable
                  key={d.key}
                  disabled={d.future}
                  onPress={() => setSelected(d)}
                  accessibilityLabel={`${dayTitle(d.key)}: ${d.reviews} reviews`}
                  hitSlop={2}
                  style={{
                    aspectRatio: 1,
                    borderRadius: 3,
                    backgroundColor: d.future ? 'transparent' : fill(d.level),
                    borderWidth: selected?.key === d.key ? 2 : 0,
                    borderColor: t.text,
                  }}
                />
              ))}
            </View>
          ))}
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <T variant="small">Less</T>
          {[0, 1, 2, 3, 4].map((l) => (
            <View key={l} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: fill(l) }} />
          ))}
          <T variant="small">Goal met</T>
        </View>
        <Pressable onPress={() => setList((v) => !v)} accessibilityRole="button" hitSlop={8}>
          <T variant="small" style={{ color: t.primary }}>
            {list ? 'Show calendar' : 'Show as list'}
          </T>
        </Pressable>
      </View>
    </View>
  );
}
