import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, Row, T } from '@/components/ui';
import { space, useTheme } from '@/constants/theme';
import { useMilestones } from '@/hooks/useMilestones';
import { useNow } from '@/hooks/useNow';
import { weekStats, type WeekStats } from '@/lib/activity';
import type { LangCode } from '@/lib/types';
import { useStore } from '@/store/useStore';

/** Banner for milestones reached since the learner last looked. */
export function MilestoneBanner({ lang }: { lang: LangCode }) {
  const t = useTheme();
  const { pending, dismiss } = useMilestones(lang);
  if (!pending.length) return null;
  return (
    <Card style={{ backgroundColor: t.accentSoft, borderColor: t.accent }}>
      <Row style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <Ionicons name="trophy" size={24} color={t.accent} />
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="small">Milestone reached</T>
          {pending.map((m) => (
            <T key={m.id} style={{ fontWeight: '600', fontSize: 17 }}>
              {m.title}
            </T>
          ))}
        </View>
      </Row>
      <Row>
        <Button compact variant="secondary" title="See all" onPress={() => router.push('/stats')} />
        <Button compact variant="ghost" title="Dismiss" onPress={dismiss} />
      </Row>
    </Card>
  );
}

/** "+12 vs week before" / "−3 vs week before" / "same as week before". */
export function delta(now: number, before: number): string {
  const d = now - before;
  return d === 0 ? 'same as week before' : `${d > 0 ? '+' : '−'}${Math.abs(d).toLocaleString()} vs week before`;
}

const retention = (w: WeekStats) => (w.reviews ? `${Math.round((1 - w.again / w.reviews) * 100)}%` : '—');

export function weekRows(cur: WeekStats, prev: WeekStats) {
  return [
    { label: 'Reviews', cur: cur.reviews.toLocaleString(), prev: prev.reviews.toLocaleString(), delta: delta(cur.reviews, prev.reviews) },
    { label: 'Days practiced', cur: `${cur.activeDays} / ${cur.length}`, prev: `${prev.activeDays} / 7`, delta: delta(cur.activeDays, prev.activeDays) },
    { label: 'Goal met', cur: `${cur.goalDays} days`, prev: `${prev.goalDays} days`, delta: delta(cur.goalDays, prev.goalDays) },
    { label: 'Words added', cur: cur.added.toLocaleString(), prev: prev.added.toLocaleString(), delta: delta(cur.added, prev.added) },
    { label: 'Remembered', cur: retention(cur), prev: retention(prev), delta: '' },
  ];
}

const weekLabel = (start: string) => {
  const [y, m, d] = start.split('-').map(Number);
  return `Week of ${new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
};

/** Recap of last week, shown once at the start of a new week until dismissed. */
export function WeeklyRecap({ lang }: { lang: LangCode }) {
  const now = useNow(60000);
  const goal = useStore((s) => s.settings.dailyGoal);
  const days = useStore((s) => s.activity[lang]);
  const seen = useStore((s) => s.weeklySeen[lang]);
  const dismissWeekly = useStore((s) => s.dismissWeekly);
  const thisWeek = weekStats(days, now, 0, goal).start;
  const last = weekStats(days, now, 1, goal);
  const before = weekStats(days, now, 2, goal);
  if (seen === thisWeek || (last.reviews === 0 && last.added === 0)) return null;
  const rows = weekRows(last, before).slice(0, 4);
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="heading">Your week</T>
        <T variant="small">{weekLabel(last.start)}</T>
      </Row>
      {rows.map((r) => (
        <Row key={r.label} style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
          <T variant="muted" style={{ flex: 1 }}>
            {r.label}
          </T>
          <View style={{ alignItems: 'flex-end' }}>
            <T style={{ fontWeight: '600' }}>{r.cur}</T>
            <T variant="small">{r.delta}</T>
          </View>
        </Row>
      ))}
      <T variant="small" style={{ marginTop: space.xs }}>
        {last.activeDays >= 5 ? 'A strong week. Keep it going!' : last.activeDays >= 3 ? 'Good work. A few minutes a day adds up.' : 'Every review counts. Try a few minutes a day this week.'}
      </T>
      <Row>
        <Button compact variant="secondary" title="Progress" onPress={() => router.push('/stats')} />
        <Button compact variant="ghost" title="Dismiss" onPress={() => dismissWeekly(lang, thisWeek)} />
      </Row>
    </Card>
  );
}
