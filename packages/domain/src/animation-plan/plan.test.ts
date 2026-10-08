import { describe, expect, it } from 'vitest';

import type { DecisionOptionData } from '../decision/schemas.js';
import { select } from '../selection/select.js';
import { ANIMATION_PLAN_DEFAULTS, buildAnimationPlan, positionAt } from './plan.js';

const ids = [
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000004',
] as const;

function makeOption(index: number, weight: number, enabled = true): DecisionOptionData {
  return {
    id: ids[index] ?? '00000000-0000-4000-8000-000000000000',
    label: `Option ${index}`,
    weight,
    enabled,
  };
}

const options = [makeOption(0, 1), makeOption(1, 3), makeOption(2, 1), makeOption(3, 5, false)];

describe('buildAnimationPlan', () => {
  it('is deterministic, preserves inputs and lays out every seeded plan', () => {
    for (let seed = 0; seed < 500; seed += 1) {
      const result = select(options, seed);
      const resultBefore = JSON.stringify(result);
      const optionsBefore = JSON.stringify(options);
      const first = buildAnimationPlan(result, options);
      const second = buildAnimationPlan(result, options);

      expect(first).toEqual(second);
      expect(JSON.stringify(result)).toBe(resultBefore);
      expect(JSON.stringify(options)).toBe(optionsBefore);
      expect(first.strip[first.winnerIndex]).toBe(result.winnerId);
      expect(first.winnerIndex - ANIMATION_PLAN_DEFAULTS.leadingItems).toBeGreaterThanOrEqual(
        ANIMATION_PLAN_DEFAULTS.minSpinItems,
      );
      expect(first.winnerIndex - ANIMATION_PLAN_DEFAULTS.leadingItems).toBeLessThan(
        ANIMATION_PLAN_DEFAULTS.minSpinItems + ANIMATION_PLAN_DEFAULTS.spinItemsJitter,
      );
      expect(first.strip).toHaveLength(
        first.winnerIndex + 1 + ANIMATION_PLAN_DEFAULTS.trailingItems,
      );
      expect(first.startPosition).toBe(ANIMATION_PLAN_DEFAULTS.leadingItems + 0.5);
      expect(first.stopPosition).toBe(first.winnerIndex + 0.5 + first.stopOffset);
      expect(Math.abs(first.stopOffset)).toBeLessThanOrEqual(ANIMATION_PLAN_DEFAULTS.stopBand / 2);
      expect(Math.floor(first.stopPosition)).toBe(first.winnerIndex);
      expect(first.strip.every((id) => result.candidateIds.includes(id))).toBe(true);
      expect(first.strip).not.toContain(ids[3]);
      expect(first.strip[first.winnerIndex - 1]).not.toBe(result.winnerId);
      expect(first.strip[first.winnerIndex + 1]).not.toBe(result.winnerId);
    }
  });

  it('keeps the winner out of both neighbours with exactly two enabled options', () => {
    const twoEnabled = [
      makeOption(0, 1),
      makeOption(1, 3),
      makeOption(2, 1, false),
      makeOption(3, 5, false),
    ];

    for (let seed = 0; seed < 500; seed += 1) {
      const result = select(twoEnabled, seed);
      const plan = buildAnimationPlan(result, twoEnabled);

      expect(plan.strip[plan.winnerIndex - 1]).not.toBe(result.winnerId);
      expect(plan.strip[plan.winnerIndex + 1]).not.toBe(result.winnerId);
    }
  });

  it('keeps filler shares close to their configured weights', () => {
    const counts = new Map<string, number>(ids.slice(0, 3).map((id) => [id, 0]));
    let total = 0;

    for (let seed = 0; seed < 2_000; seed += 1) {
      const result = select(options, seed);
      const plan = buildAnimationPlan(result, options);

      plan.strip.forEach((id, index) => {
        if (
          index === plan.winnerIndex ||
          index === plan.winnerIndex - 1 ||
          index === plan.winnerIndex + 1
        ) {
          return;
        }
        counts.set(id, (counts.get(id) ?? 0) + 1);
        total += 1;
      });
    }

    for (const [id, expectedShare] of [
      [ids[0], 0.2],
      [ids[1], 0.6],
      [ids[2], 0.2],
    ] as const) {
      const actualShare = (counts.get(id) ?? 0) / total;
      expect(Math.abs(actualShare - expectedShare)).toBeLessThanOrEqual(0.03);
    }
  });

  it('clamps positionAt and follows a non-decreasing timeline', () => {
    const result = select(options, 42);
    const plan = buildAnimationPlan(result, options);

    expect(positionAt(plan, -1)).toBe(plan.startPosition);
    expect(positionAt(plan, plan.durationMs)).toBe(plan.stopPosition);
    expect(positionAt(plan, plan.durationMs + 1)).toBe(plan.stopPosition);

    let previous = positionAt(plan, 0);
    for (let sample = 1; sample <= 200; sample += 1) {
      const current = positionAt(plan, (plan.durationMs * sample) / 200);
      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
  });

  it('rejects inconsistent selection results', () => {
    const result = select(options, 42);

    expect(() => buildAnimationPlan({ ...result, winnerId: ids[3] }, options)).toThrow(RangeError);
    expect(() =>
      buildAnimationPlan({ ...result, candidateIds: [ids[1], ids[0], ids[2]] }, options),
    ).toThrow(RangeError);
    expect(() =>
      buildAnimationPlan({ ...result, candidateIds: [...result.candidateIds, ids[3]] }, options),
    ).toThrow(RangeError);
    expect(() =>
      buildAnimationPlan({ ...result, algorithm: 'other' as 'weighted-v1' }, options),
    ).toThrow(RangeError);
  });

  it('honours custom spin bounds', () => {
    const result = select(options, 42);
    const plan = buildAnimationPlan(result, options, {
      ...ANIMATION_PLAN_DEFAULTS,
      minSpinItems: 10,
      spinItemsJitter: 1,
    });

    expect(plan.winnerIndex).toBe(ANIMATION_PLAN_DEFAULTS.leadingItems + 10);
  });

  it('pins the seed-42 layout', () => {
    const result = select(options, 42);
    const plan = buildAnimationPlan(result, options);

    expect({
      winnerIndex: plan.winnerIndex,
      stopOffset: plan.stopOffset,
      strip: plan.strip.slice(0, 12),
    }).toEqual({
      winnerIndex: 51,
      stopOffset: 0.2911521795205772,
      strip: [
        ids[1],
        ids[1],
        ids[1],
        ids[2],
        ids[1],
        ids[1],
        ids[1],
        ids[1],
        ids[1],
        ids[2],
        ids[1],
        ids[1],
      ],
    });
  });

  it('reveals only inside the final threshold window', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const result = select(options, seed);
      const plan = buildAnimationPlan(result, options);
      const remainingAtReveal = plan.stopPosition - positionAt(plan, plan.revealAtMs);
      const remainingBeforeReveal = plan.stopPosition - positionAt(plan, plan.revealAtMs - 1);

      expect(plan.revealAtMs).toBeGreaterThan(0);
      expect(plan.revealAtMs).toBeLessThanOrEqual(plan.durationMs);
      expect(remainingAtReveal).toBeLessThan(ANIMATION_PLAN_DEFAULTS.revealThresholdItems);
      expect(remainingBeforeReveal).toBeGreaterThanOrEqual(
        ANIMATION_PLAN_DEFAULTS.revealThresholdItems,
      );
    }
  });

  it('pins the default reveal time for seed 42', () => {
    const result = select(options, 42);
    const plan = buildAnimationPlan(result, options);

    expect(plan.revealAtMs).toBe(6_864);
    expect(plan.revealAtMs).toBeGreaterThanOrEqual(6_000);
    expect(plan.revealAtMs).toBeLessThanOrEqual(7_500);
  });
});
