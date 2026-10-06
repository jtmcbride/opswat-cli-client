import { useMemo } from 'react';
import { View } from 'react-native';

import { ColumnChart, type Column } from '@/components/ColumnChart';
import { Card, Row, Screen, T } from '@/components/ui';
import { space, useTheme } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { forecast, lastDays, retentionRate, streak } from '@/lib/activity';
import { isNew } from '@/lib/srs';
import { languageName, useStore } from '@/store/useStore';

const label = (key: string, style: 'short' | 'long') => {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return style === 'short'
    ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

function Tile({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <Card style={{ flex: 1, minWidth: 140, gap: space.xs }}>
      <T variant="small">{title}</T>
      <T style={{ fontSize: 24, fontWeight: '600' }}>{value}</T>
      {sub && <T variant="small">{sub}</T>}
    </Card>
  );
}

export default function StatsScreen() {
  const t = useTheme();
  const now = useNow(60000);
  const lang = useStore((s) => s.settings.activeLang);
  const goal = useStore((s) => s.settings.dailyGoal);
  const custom = useStore((s) => s.customLanguages);
  const days = useStore((s) => s.activity[lang]);
  const allWords = useStore((s) => s.words);
  const words = useMemo(() => allWords.filter((w) => w.lang === lang), [allWords, lang]);

  const last14 = useMemo(() => lastDays(days, now, 14), [days, now]);
  const today = last14.at(-1)!;
  const addedWeek = last14.slice(-7).reduce((s, d) => s + d.added, 0);
  const reviews30 = lastDays(days, now, 30).reduce((s, d) => s + d.reviews, 0);
  const retention = retentionRate(days, now);
  const upcoming = useMemo(
    () =>
      forecast(
        words
          .filter((w) => !w.suspended)
          .flatMap((w) => (w.produce ? [w.srs, w.produce] : [w.srs]))
          .filter((s) => !isNew(s))
          .map((s) => s.due),
        now,
        14,
      ),
    [words, now],
  );

  const toColumns = (series: { key: string; value: number }[]): Column[] =>
    series.map((d) => ({ key: d.key, label: label(d.key, 'short'), title: label(d.key, 'long'), value: d.value }));

  const goalShare = Math.min(1, today.reviews / Math.max(1, goal));

  return (
    <Screen edges={['bottom']}>
      <View style={{ alignItems: 'center', gap: space.xs }}>
        <T variant="small">{languageName(lang, custom)} words in your deck</T>
        <T style={{ fontSize: 52, fontWeight: '600', color: t.text }}>{words.length.toLocaleString()}</T>
        <T variant="small">{addedWeek > 0 ? `+${addedWeek} this week` : 'None added this week'}</T>
      </View>

      <Row style={{ flexWrap: 'wrap' }}>
        <Tile title="Streak" value={`${streak(days, now)} days`} sub="Days in a row with reviews" />
        <Tile
          title="Retention"
          value={retention === null ? '—' : `${Math.round(retention * 100)}%`}
          sub={`Remembered, last 30 days (${reviews30} reviews)`}
        />
      </Row>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T variant="heading">Today</T>
          <T variant="muted">
            {today.reviews} / {goal} reviews
          </T>
        </Row>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: t.surfaceAlt, overflow: 'hidden' }}>
          <View style={{ width: `${goalShare * 100}%`, height: '100%', backgroundColor: goalShare >= 1 ? t.success : t.primary }} />
        </View>
      </Card>

      <Card>
        <T variant="heading">Reviews per day</T>
        <ColumnChart data={toColumns(last14.map((d) => ({ key: d.key, value: d.reviews })))} unit="reviews" goal={goal} />
      </Card>

      <Card>
        <T variant="heading">Upcoming reviews</T>
        <T variant="small">Next 14 days; today includes overdue cards</T>
        <ColumnChart data={toColumns(upcoming.map((d) => ({ key: d.key, value: d.due })))} unit="due" />
      </Card>

      <Card>
        <T variant="heading">Words added per day</T>
        <ColumnChart data={toColumns(last14.map((d) => ({ key: d.key, value: d.added })))} unit="words" />
      </Card>
    </Screen>
  );
}
