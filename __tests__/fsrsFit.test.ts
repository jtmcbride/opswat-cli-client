import { fitWeights, prepareFit, replayLoss } from '@/lib/fsrsFit';
import { seededRandom } from '@/lib/picker';
import { DEFAULT_WEIGHTS, GRADE_VALUE, newSrs, retrievability, schedule } from '@/lib/srs';
import type { Grade, ReviewEntry, SrsState } from '@/lib/types';

const DAY = 86400000;

/**
 * A simulated learner whose memory follows `truth`, reviewed on the schedule the app computes
 * with default parameters. Returns the review log the app would have recorded.
 */
function simulate(truth: number[], cards: number, seed: number): Record<string, ReviewEntry[]> {
  const rand = seededRandom(seed);
  const log: Record<string, ReviewEntry[]> = { all: [] };
  for (let c = 0; c < cards; c++) {
    let app: SrsState = newSrs(0);
    let real: SrsState = newSrs(0);
    let t = c * 1000;
    for (let i = 0; i < 8; i++) {
      let grade: Grade;
      if (real.state === 'new') grade = rand() < 0.3 ? 'again' : rand() < 0.8 ? 'good' : 'easy';
      else {
        const elapsed = (t - (real.lastReview ?? t)) / DAY;
        const recalled = rand() < (elapsed < 1 ? 0.95 : retrievability(elapsed, real.stability));
        grade = !recalled ? 'again' : rand() < 0.15 ? 'hard' : rand() < 0.85 ? 'good' : 'easy';
      }
      log.all.push([t, `es:w${c}`, 0, GRADE_VALUE[grade], app.state === 'new' ? 1 : 0]);
      app = schedule(app, grade, t);
      real = schedule(real, grade, t, { weights: truth });
      // Learners don't review exactly on time.
      t = app.due + Math.round((rand() - 0.3) * 0.5 * (app.due - t));
    }
  }
  return log;
}

describe('prepareFit', () => {
  it('groups reviews into cards starting at their first review', () => {
    const log: Record<string, ReviewEntry[]> = {
      a: [
        [0, 'es:casa', 0, 3, 1],
        [0, 'es:gato', 0, 3, 0], // first seen before logging: skipped
      ],
      b: [
        [2 * DAY, 'es:casa', 0, 1, 0],
        [2 * DAY + 60000, 'es:casa', 0, 3, 0],
        [3 * DAY, 'es:casa', 1, 3, 1], // production card: separate
      ],
    };
    const data = prepareFit(log);
    expect(data.sequences).toHaveLength(1);
    expect(data.sequences[0].map((r) => r.g)).toEqual([3, 1, 3]);
    expect(data.reviews).toBe(1);
  });
});

describe('fitWeights', () => {
  it('learns a memory that is stronger than the defaults assume', async () => {
    const truth = DEFAULT_WEIGHTS.map((w, i) => (i <= 3 ? w * 4 : i === 8 ? w + 0.4 : w));
    const data = prepareFit(simulate(truth, 300, 7));
    expect(data.reviews).toBeGreaterThan(1000);

    const fit = await fitWeights(data, { iterations: 60 });
    expect(fit.after).toBeLessThan(fit.before);
    expect(fit.improvement).toBeGreaterThan(0.02);
    // Initial stability after "good" moves toward the truth.
    expect(fit.weights[2]).toBeGreaterThan(DEFAULT_WEIGHTS[2] * 1.5);

    // And it generalizes to a fresh learner with the same memory.
    const fresh = prepareFit(simulate(truth, 200, 99)).sequences;
    expect(replayLoss(fit.weights, fresh).loss).toBeLessThan(replayLoss(DEFAULT_WEIGHTS, fresh).loss);
  }, 60000);

  it('stays close to the defaults when they already fit', async () => {
    const data = prepareFit(simulate([...DEFAULT_WEIGHTS], 200, 3));
    const fit = await fitWeights(data, { iterations: 40 });
    expect(Math.abs(fit.improvement)).toBeLessThan(0.02);
    fit.weights.forEach((w, i) => expect(w / DEFAULT_WEIGHTS[i]).toBeGreaterThan(0.5));
  }, 60000);
});
