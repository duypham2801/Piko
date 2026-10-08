import { describe, expect, it } from 'vitest';

import type { DecisionOptionData } from '../decision/schemas.js';
import { SelectionResult } from './result.js';
import { select } from './select.js';

const ids = [
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000005',
] as const;

function makeOption(index: number, weight: number, enabled = true): DecisionOptionData {
  return {
    id: ids[index] ?? '00000000-0000-4000-8000-000000000000',
    label: `Option ${index}`,
    weight,
    enabled,
  };
}

const weightedOptions = [makeOption(0, 1), makeOption(1, 3), makeOption(2, 1)];

describe('select', () => {
  it.each([
    [0, ids[1]],
    [1, ids[1]],
    [2, ids[1]],
    [3, ids[1]],
    [4, ids[2]],
    [5, ids[1]],
    [6, ids[1]],
    [7, ids[0]],
    [42, ids[1]],
  ])('selects the golden winner for seed %d', (seed, winnerId) => {
    expect(select(weightedOptions, seed).winnerId).toBe(winnerId);
  });

  it('is deterministic and does not mutate options', () => {
    const before = JSON.stringify(weightedOptions);
    const first = select(weightedOptions, 42);
    const second = select(weightedOptions, 42);

    expect(first).toEqual(second);
    expect(JSON.stringify(weightedOptions)).toBe(before);
  });

  it('excludes disabled options from candidates and winners', () => {
    const options = [makeOption(0, 1), makeOption(1, 1), makeOption(2, 5, false)];

    expect(select(options, 42).candidateIds).toEqual([ids[0], ids[1]]);
    for (let seed = 0; seed < 1000; seed += 1) {
      expect(select(options, seed).winnerId).not.toBe(ids[2]);
    }
  });

  it('follows the weighted distribution over many deterministic seeds', () => {
    const counts = new Map<string, number>();
    ids.slice(0, 3).forEach((id) => counts.set(id, 0));

    for (let seed = 0; seed < 10_000; seed += 1) {
      const winnerId = select(weightedOptions, seed).winnerId;
      counts.set(winnerId, (counts.get(winnerId) ?? 0) + 1);
    }

    for (const [id, expectedShare] of [
      [ids[0], 0.2],
      [ids[1], 0.6],
      [ids[2], 0.2],
    ] as const) {
      const ratio = (counts.get(id) ?? 0) / 10_000;
      expect(ratio).toBeGreaterThanOrEqual(expectedShare - 0.03);
      expect(ratio).toBeLessThanOrEqual(expectedShare + 0.03);
    }
  });

  it('distributes equal weights evenly', () => {
    const options = ids.slice(0, 4).map((_, index) => makeOption(index, 1));
    const counts = new Map(options.map((option) => [option.id, 0]));

    for (let seed = 0; seed < 10_000; seed += 1) {
      const winnerId = select(options, seed).winnerId;
      counts.set(winnerId, (counts.get(winnerId) ?? 0) + 1);
    }

    for (const option of options) {
      const ratio = (counts.get(option.id) ?? 0) / 10_000;
      expect(ratio).toBeGreaterThanOrEqual(0.22);
      expect(ratio).toBeLessThanOrEqual(0.28);
    }
  });

  it('throws RangeError for invalid candidate counts and seeds', () => {
    const oneEnabled = [makeOption(0, 1), makeOption(1, 1, false)];

    expect(() => select(oneEnabled, 0)).toThrow(RangeError);
    expect(() => select(weightedOptions, -1)).toThrow(RangeError);
    expect(() => select(weightedOptions, 2 ** 32)).toThrow(RangeError);
    expect(() => select(weightedOptions, 1.5)).toThrow(RangeError);
  });

  it('returns a result accepted by SelectionResult', () => {
    expect(SelectionResult.safeParse(select(weightedOptions, 42)).success).toBe(true);
  });
});
