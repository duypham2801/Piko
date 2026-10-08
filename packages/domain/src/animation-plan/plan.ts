import type { DecisionOptionData } from '../decision/schemas.js';
import { createRng } from '../selection/prng.js';
import { SELECTION_ALGORITHM } from '../selection/result.js';
import type { SelectionResultData } from '../selection/result.js';
import { pickWeighted } from '../selection/weighted.js';
import { spinProgress } from './curve.js';

const PLAN_SEED_SALT = 0x9e3779b9;
const REVEAL_BISECTION_ITERATIONS = 40;

export const ANIMATION_PLAN_DEFAULTS = {
  leadingItems: 8,
  trailingItems: 8,
  minSpinItems: 40,
  spinItemsJitter: 8,
  stopBand: 0.9,
  durationMs: 8000,
  accelFraction: 0.06,
  decelPower: 3,
  revealThresholdItems: 0.02,
} as const;

export type AnimationPlanParams = {
  readonly [K in keyof typeof ANIMATION_PLAN_DEFAULTS]: number;
};

export type AnimationPlan = {
  strip: string[];
  winnerIndex: number;
  startPosition: number;
  stopPosition: number;
  stopOffset: number;
  durationMs: number;
  accelFraction: number;
  decelPower: number;
  revealAtMs: number;
};

export function buildAnimationPlan(
  result: SelectionResultData,
  options: readonly DecisionOptionData[],
  params: AnimationPlanParams = ANIMATION_PLAN_DEFAULTS,
): AnimationPlan {
  const candidates = options.filter((option) => option.enabled);
  const candidateIds = candidates.map((candidate) => candidate.id);
  const candidateIdsMatch =
    candidateIds.length === result.candidateIds.length &&
    candidateIds.every((candidateId, index) => candidateId === result.candidateIds[index]);
  if (
    !candidateIdsMatch ||
    !candidateIds.includes(result.winnerId) ||
    result.algorithm !== SELECTION_ALGORITHM
  ) {
    throw new RangeError('Selection result does not match the enabled options.');
  }

  const rng = createRng((result.seed ^ PLAN_SEED_SALT) >>> 0);
  const spinItems = params.minSpinItems + Math.floor(rng() * params.spinItemsJitter);
  const stopOffset = ((rng() * 2 - 1) * params.stopBand) / 2;
  const startIndex = params.leadingItems;
  const startPosition = startIndex + 0.5;
  const winnerIndex = startIndex + spinItems;
  const strip = new Array<string>(winnerIndex + 1 + params.trailingItems);
  strip[winnerIndex] = result.winnerId;
  const eligibleWithoutWinner = candidates.filter((candidate) => candidate.id !== result.winnerId);

  for (let index = 0; index < strip.length; index += 1) {
    if (index === winnerIndex) {
      continue;
    }
    const eligible =
      index === winnerIndex - 1 || index === winnerIndex + 1 ? eligibleWithoutWinner : candidates;
    strip[index] = pickWeighted(eligible, rng).id;
  }

  const plan: AnimationPlan = {
    strip,
    winnerIndex,
    startPosition,
    stopPosition: winnerIndex + 0.5 + stopOffset,
    stopOffset,
    durationMs: params.durationMs,
    accelFraction: params.accelFraction,
    decelPower: params.decelPower,
    revealAtMs: params.durationMs,
  };

  let lowerBound = 0;
  let upperBound = plan.durationMs;
  for (let iteration = 0; iteration < REVEAL_BISECTION_ITERATIONS; iteration += 1) {
    const midpoint = (lowerBound + upperBound) / 2;
    const remaining = plan.stopPosition - positionAt(plan, midpoint);
    if (remaining < params.revealThresholdItems) {
      upperBound = midpoint;
    } else {
      lowerBound = midpoint;
    }
  }

  plan.revealAtMs = Math.min(plan.durationMs, Math.max(0, Math.ceil(upperBound)));
  return plan;
}

export function positionAt(plan: AnimationPlan, elapsedMs: number): number {
  if (elapsedMs <= 0) {
    return plan.startPosition;
  }
  if (elapsedMs >= plan.durationMs) {
    return plan.stopPosition;
  }

  return (
    plan.startPosition +
    (plan.stopPosition - plan.startPosition) *
      spinProgress(elapsedMs / plan.durationMs, plan.accelFraction, plan.decelPower)
  );
}
