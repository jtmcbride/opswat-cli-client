import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { View } from 'react-native';

import { ColumnChart, type Column } from '@/components/ColumnChart';
import { weekRows } from '@/components/Celebrations';
import { CoverageBar } from '@/components/CoverageBar';
import { ActivityCalendar, STRENGTH_HELP, StrengthBar } from '@/components/ProgressCharts';
import { Button, Card, Row, Screen, T } from '@/components/ui';
import { space, useTheme } from '@/constants/theme';
import { useDictionary, useKnown } from '@/hooks/useDictionary';
import { useMilestones } from '@/hooks/useMilestones';
import { useNow } from '@/hooks/useNow';
import { bestStreak, calendar, forecast, goalDays, lastDays, retentionRate, streak, weekStats } from '@/lib/activity';
import { corpusCoverage } from '@/lib/coverage';
import { withArticle } from '@/lib/grammar';
import { directions } from '@/lib/queue';
import { isNew } from '@/lib/srs';
import { strengthCounts } from '@/lib/strength';
import { languageName, useStore } from '@/store/useStore';

const CALENDAR_WEEKS = 16;
const pct = (x: number) => `${(x * 100).toFixed(x < 0.1 ? 1 : 0)}%`;

const label = (key: string, style: 'short' | 'long') => {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return style === 'short'
    ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

function Tile({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <Card style={{ flex: 1, minWidth: 100, gap: space.xs }}>
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
  const dirs = directions(useStore((s) => s.settings.reviewDirection));
  const addWord = useStore((s) => s.addWord);
  const { index, sentences } = useDictionary(lang);
  const { lemmas } = useKnown(lang, index);
  const coverage = useMemo(() => (index ? corpusCoverage(sentences, index, lemmas) : null), [sentences, index, lemmas]);
  const strength = useMemo(() => strengthCounts(words), [words]);
  const weeks = useMemo(() => calendar(days, now, CALENDAR_WEEKS, goal), [days, now, goal]);
  const thisWeek = weekStats(days, now, 0, goal);
  const week = weekRows(thisWeek, weekStats(days, now, 1, goal));
  const addedWeek = thisWeek.added;
  const { tracks } = useMilestones(lang);

  const last14 = useMemo(() => lastDays(days, now, 14), [days, now]);
  const today = last14.at(-1)!;
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
        <Tile title="Streak" value={`${streak(days, now)} days`} sub={`Best: ${bestStreak(days)} days`} />
        <Tile title="Goal met" value={`${goalDays(days, now, goal)} / 30`} sub="Days in the last 30" />
        <Tile
          title="Retention"
          value={retention === null ? '—' : `${Math.round(retention * 100)}%`}
          sub={`Last 30 days (${reviews30} reviews)`}
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
        <T variant="heading">This week</T>
        <Row style={{ flexWrap: 'nowrap' }}>
          <View style={{ flex: 1 }} />
          <T variant="small" style={{ width: 90, textAlign: 'right' }}>
            So far
          </T>
          <T variant="small" style={{ width: 90, textAlign: 'right' }}>
            Last week
          </T>
        </Row>
        {week.map((r) => (
          <Row key={r.label} style={{ flexWrap: 'nowrap', borderTopWidth: 1, borderColor: t.surfaceAlt, paddingTop: space.xs }}>
            <T variant="muted" style={{ flex: 1 }}>
              {r.label}
            </T>
            <T style={{ width: 90, textAlign: 'right', fontWeight: '600' }}>{r.cur}</T>
            <T variant="muted" style={{ width: 90, textAlign: 'right' }}>
              {r.prev}
            </T>
          </Row>
        ))}
      </Card>

      <Card>
        <T variant="heading">Activity</T>
        <T variant="small">Last {CALENDAR_WEEKS} weeks</T>
        <ActivityCalendar weeks={weeks} goal={goal} />
      </Card>

      <Card>
        <T variant="heading">Vocabulary strength</T>
        <StrengthBar counts={strength.recognize} label={dirs.includes('produce') ? 'Recognizing (word → meaning)' : 'Words'} />
        {dirs.includes('produce') && <StrengthBar counts={strength.produce} label="Producing (meaning → word)" />}
        <T variant="small">{STRENGTH_HELP}</T>
      </Card>

      {coverage && (
        <Card>
          <T variant="heading">Everyday coverage</T>
          <T variant="small">Share of the words in everyday example sentences that are in your deck</T>
          <T style={{ fontSize: 28, fontWeight: '600' }}>{pct(coverage.ratio)}</T>
          <CoverageBar ratio={coverage.ratio} label={false} neutral />
          {coverage.next.length > 0 && (
            <>
              <T variant="small" style={{ marginTop: space.sm }}>
                Learn next: the most common words you don&apos;t have yet
              </T>
              {coverage.next.map(({ lemma, gain }) => {
                const e = index?.get(lemma);
                if (!e) return null;
                return (
                  <Row key={lemma} style={{ flexWrap: 'nowrap' }}>
                    <View style={{ flex: 1 }}>
                      <T style={{ fontWeight: '600' }}>
                        {withArticle(lang, e.lemma, e.gender)} <T variant="small">+{pct(gain)}</T>
                      </T>
                      <T variant="muted" numberOfLines={1}>
                        {e.gloss}
                      </T>
                    </View>
                    <Button compact variant="secondary" title="Add" onPress={() => addWord(lang, e.lemma, e.gloss)} />
                  </Row>
                );
              })}
            </>
          )}
        </Card>
      )}

      {tracks.length > 0 && (
        <Card>
          <T variant="heading">Milestones</T>
          {tracks.map((tr) => (
            <View key={tr.id} style={{ gap: 4, borderTopWidth: 1, borderColor: t.surfaceAlt, paddingTop: space.sm }}>
              <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                <T style={{ fontWeight: '600', flex: 1 }}>{tr.name}</T>
                {tr.reached && (
                  <Row style={{ gap: 4 }}>
                    <Ionicons name="trophy" size={14} color={t.accent} />
                    <T variant="small">{tr.reached.title}</T>
                  </Row>
                )}
              </Row>
              {tr.next ? (
                <>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: t.surfaceAlt, overflow: 'hidden' }}>
                    <View style={{ width: `${Math.min(1, tr.next.share) * 100}%`, height: '100%', backgroundColor: t.primary }} />
                  </View>
                  <T variant="small">
                    Next: {tr.next.milestone.title} · {tr.next.value} / {tr.next.target}
                  </T>
                </>
              ) : (
                <T variant="small">All milestones reached!</T>
              )}
            </View>
          ))}
        </Card>
      )}

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
