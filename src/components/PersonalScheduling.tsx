import { useMemo, useState } from 'react';

import { Button, Row, T } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { fitWeights, MIN_FIT_REVIEWS, prepareFit } from '@/lib/fsrsFit';
import { useStore } from '@/store/useStore';

/** Fits the scheduler to the learner's review history (Settings → Flashcards). */
export function PersonalScheduling() {
  const t = useTheme();
  const log = useStore((s) => s.reviewLog);
  const fit = useStore((s) => s.settings.fsrsFit);
  const weights = useStore((s) => s.settings.fsrsWeights);
  const setSettings = useStore((s) => s.setSettings);
  const data = useMemo(() => prepareFit(log), [log]);
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const run = async () => {
    setMessage(null);
    setProgress(0);
    try {
      const r = await fitWeights(data, { onProgress: setProgress });
      if (r.improvement > 0.005) {
        setSettings({ fsrsWeights: r.weights, fsrsFit: { reviews: r.reviews, improvement: r.improvement, at: Date.now() } });
      } else {
        setMessage('The default scheduler already fits your reviews well, so it was kept.');
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setProgress(null);
    }
  };

  return (
    <>
      <T variant="small">Personal scheduling</T>
      {weights && fit ? (
        <T variant="muted">
          Tuned to {fit.reviews} of your reviews ({new Date(fit.at).toLocaleDateString()}): it predicts what you&apos;ll
          remember {fit.improvement < 0.01 ? 'slightly' : `${Math.round(fit.improvement * 100)}%`} better than the default,
          on reviews held back for testing.
        </T>
      ) : (
        <T variant="muted">
          {data.reviews < MIN_FIT_REVIEWS
            ? `After ${MIN_FIT_REVIEWS - data.reviews} more reviews (${data.reviews} so far), Leximble can tune review timing to how your memory works.`
            : `You have ${data.reviews} reviews: enough to tune review timing to how your memory works.`}
        </T>
      )}
      {progress !== null ? (
        <T variant="small">Fitting… {Math.round(progress * 100)}%</T>
      ) : (
        <Row>
          {data.reviews >= MIN_FIT_REVIEWS && (
            <Button compact variant="secondary" icon="analytics-outline" title={weights ? 'Re-fit' : 'Fit to my reviews'} onPress={run} />
          )}
          {weights && (
            <Button
              compact
              variant="ghost"
              title="Use defaults"
              onPress={() => {
                setSettings({ fsrsWeights: null, fsrsFit: null });
                setMessage(null);
              }}
            />
          )}
        </Row>
      )}
      {message && <T variant="small" style={message.startsWith('The default') ? undefined : { color: t.danger }}>{message}</T>}
    </>
  );
}
