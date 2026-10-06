import { useEffect, useMemo } from 'react';

import { useDictionary, useKnown } from '@/hooks/useDictionary';
import { bestStreak } from '@/lib/activity';
import { corpusCoverage } from '@/lib/coverage';
import { milestones, toCelebrate } from '@/lib/milestones';
import { strengthCounts } from '@/lib/strength';
import type { LangCode } from '@/lib/types';
import { useStore } from '@/store/useStore';

const NONE: string[] = [];

/** Milestone progress for a language, plus newly reached ones to celebrate. */
export function useMilestones(lang: LangCode) {
  const days = useStore((s) => s.activity[lang]);
  const celebrated = useStore((s) => s.celebrated[lang]);
  const markCelebrated = useStore((s) => s.markCelebrated);
  const { index, sentences } = useDictionary(lang);
  const { words, lemmas } = useKnown(lang, index);

  const result = useMemo(() => {
    if (!index) return null;
    const active = words.filter((w) => !w.suspended);
    const coverage = corpusCoverage(sentences, index, lemmas);
    return milestones({
      words: active.length,
      mastered: strengthCounts(active).recognize.mastered,
      bestStreak: bestStreak(days),
      reviews: Object.values(days ?? {}).reduce((s, d) => s + d.reviews, 0),
      coverage: coverage?.ratio ?? null,
    });
  }, [index, sentences, lemmas, words, days]);

  // The first time milestones are computed for a language, everything already reached counts as
  // celebrated, so existing learners aren't greeted with a backlog.
  useEffect(() => {
    if (result && celebrated === undefined) markCelebrated(lang, result.achieved.map((m) => m.id));
  }, [result, celebrated, lang, markCelebrated]);

  const pending = useMemo(
    () => (result && celebrated !== undefined ? toCelebrate(result.achieved, celebrated ?? NONE) : []),
    [result, celebrated],
  );
  // Dismissing marks everything reached, including smaller steps passed at the same time.
  const dismiss = () => markCelebrated(lang, result?.achieved.map((m) => m.id) ?? []);
  return { tracks: result?.tracks ?? [], pending, dismiss };
}
