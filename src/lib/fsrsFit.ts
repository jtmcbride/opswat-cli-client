import {
  DEFAULT_WEIGHTS,
  initDifficulty,
  initStability,
  lapseStability,
  nextDifficulty,
  recallStability,
  retrievability,
  shortTermStability,
} from './srs';
import type { ReviewEntry } from './types';

/**
 * Fits FSRS parameters to a learner's own review history: replays each card's reviews with
 * candidate parameters, scores how well the predicted recall matched what actually happened (log
 * loss), and descends that loss. Parameters are kept near the defaults unless the data clearly
 * says otherwise, and new parameters are only used if they predict held-out cards better.
 */

const DAY = 24 * 60 * 60 * 1000;

/** Reviews (at least a day after the previous one) needed before fitting is worthwhile. */
export const MIN_FIT_REVIEWS = 300;

// Allowed ranges per parameter (as in the reference FSRS optimizer).
const BOUNDS: [number, number][] = [
  [0.001, 100],
  [0.001, 100],
  [0.001, 100],
  [0.001, 100],
  [1, 10],
  [0.001, 4],
  [0.001, 4],
  [0.001, 0.75],
  [0, 4.5],
  [0, 0.8],
  [0.001, 3.5],
  [0.001, 5],
  [0.001, 0.25],
  [0.001, 0.9],
  [0, 4],
  [0, 1],
  [1, 6],
  [0, 2],
  [0, 2],
];

interface Review {
  t: number;
  g: number;
}

export interface FitData {
  /** Each card's reviews, starting from its first (new-card) review. */
  sequences: Review[][];
  /** Reviews that test memory: at least a day after the previous review of the card. */
  reviews: number;
}

/** Groups the log into per-card review sequences. Cards first seen before logging began are skipped. */
export function prepareFit(log: Record<string, ReviewEntry[]>, maxReviews = 5000): FitData {
  const entries = Object.values(log)
    .flat()
    .sort((a, b) => a[0] - b[0]);
  const open = new Map<string, Review[]>();
  const sequences: Review[][] = [];
  for (const [t, key, dir, g, wasNew] of entries) {
    const card = `${key}|${dir}`;
    let seq = open.get(card);
    if (wasNew) {
      seq = [];
      open.set(card, seq);
      sequences.push(seq);
    }
    seq?.push({ t, g });
  }
  // Keep the most recent cards when there's more history than needed.
  const kept: Review[][] = [];
  let reviews = 0;
  for (let i = sequences.length - 1; i >= 0 && reviews < maxReviews; i--) {
    const n = countTested(sequences[i]);
    if (!n) continue;
    kept.push(sequences[i]);
    reviews += n;
  }
  return { sequences: kept.reverse(), reviews };
}

function countTested(seq: Review[]): number {
  let n = 0;
  for (let i = 1; i < seq.length; i++) if (seq[i].t - seq[i - 1].t >= DAY) n++;
  return n;
}

/** Total log loss of predicted recall over the sequences, and how many reviews it scored. */
export function replayLoss(w: readonly number[], sequences: Review[][]): { loss: number; n: number } {
  let loss = 0;
  let n = 0;
  for (const seq of sequences) {
    let s = initStability(w, seq[0].g);
    let d = initDifficulty(w, seq[0].g);
    for (let i = 1; i < seq.length; i++) {
      const { t, g } = seq[i];
      const elapsed = (t - seq[i - 1].t) / DAY;
      if (elapsed >= 1) {
        const r = Math.min(1 - 1e-4, Math.max(1e-4, retrievability(elapsed, s)));
        loss -= g > 1 ? Math.log(r) : Math.log(1 - r);
        n++;
        s = g === 1 ? lapseStability(w, d, s, r) : recallStability(w, d, s, r, g);
      } else {
        s = shortTermStability(w, s, g);
      }
      s = Math.max(s, 0.1);
      d = nextDifficulty(w, d, g);
    }
  }
  return { loss, n };
}

const toWeights = (theta: number[]) =>
  theta.map((x, i) => Math.min(BOUNDS[i][1], Math.max(BOUNDS[i][0], DEFAULT_WEIGHTS[i] * Math.exp(x))));

export interface FitResult {
  weights: number[];
  /** Mean log loss on held-out cards with default and fitted parameters. */
  before: number;
  after: number;
  /** Relative reduction in held-out log loss (0.05 = predictions 5% better). */
  improvement: number;
  reviews: number;
}

export async function fitWeights(
  data: FitData,
  opts: { iterations?: number; onProgress?: (fraction: number) => void } = {},
): Promise<FitResult> {
  const iterations = opts.iterations ?? 80;
  // Every fifth card is held out to check the fit generalizes.
  const train = data.sequences.filter((_, i) => i % 5 !== 0);
  const test = data.sequences.filter((_, i) => i % 5 === 0);
  const nTrain = Math.max(1, replayLoss(DEFAULT_WEIGHTS, train).n);
  // Pull toward the defaults; weaker as evidence grows.
  const lambda = 5 / nTrain;
  const objective = (theta: number[]) =>
    replayLoss(toWeights(theta), train).loss / nTrain + lambda * theta.reduce((sum, x) => sum + x * x, 0);

  // Adam on log-scale offsets from the defaults, with finite-difference gradients.
  const theta = DEFAULT_WEIGHTS.map(() => 0);
  const m = theta.map(() => 0);
  const v = theta.map(() => 0);
  const lr = 0.05;
  const h = 1e-4;
  for (let step = 1; step <= iterations; step++) {
    const base = objective(theta);
    const grads = theta.map((_, i) => {
      const probe = [...theta];
      probe[i] += h;
      return (objective(probe) - base) / h;
    });
    for (let i = 0; i < theta.length; i++) {
      const grad = grads[i];
      m[i] = 0.9 * m[i] + 0.1 * grad;
      v[i] = 0.999 * v[i] + 0.001 * grad * grad;
      const mHat = m[i] / (1 - 0.9 ** step);
      const vHat = v[i] / (1 - 0.999 ** step);
      theta[i] -= (lr * mHat) / (Math.sqrt(vHat) + 1e-8);
    }
    opts.onProgress?.(step / iterations);
    // Let the UI breathe between steps.
    await new Promise((r) => setTimeout(r, 0));
  }

  const weights = toWeights(theta).map((x) => Number(x.toFixed(4)));
  const held = (w: readonly number[]) => {
    const { loss, n } = replayLoss(w, test);
    return n ? loss / n : 0;
  };
  const before = held(DEFAULT_WEIGHTS);
  const after = held(weights);
  return { weights, before, after, improvement: before > 0 ? (before - after) / before : 0, reviews: data.reviews };
}
