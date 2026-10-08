import { describe, expect, it } from 'vitest';

import { spinProgress } from './curve.js';

const accelFraction = 0.06;
const decelPower = 3;

describe('spinProgress', () => {
  it('clamps endpoints and out-of-range inputs', () => {
    expect(spinProgress(0, accelFraction, decelPower)).toBe(0);
    expect(spinProgress(1, accelFraction, decelPower)).toBe(1);
    expect(spinProgress(-1, accelFraction, decelPower)).toBe(0);
    expect(spinProgress(2, accelFraction, decelPower)).toBe(1);
  });

  it('is monotonic over the normalized timeline', () => {
    let previous = spinProgress(0, accelFraction, decelPower);

    for (let sample = 1; sample <= 1_000; sample += 1) {
      const current = spinProgress(sample / 1_000, accelFraction, decelPower);
      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
  });

  it('keeps velocity continuous at the acceleration boundary', () => {
    const delta = 1e-6;
    const before = spinProgress(accelFraction - delta, accelFraction, decelPower);
    const after = spinProgress(accelFraction + delta, accelFraction, decelPower);
    const beforeVelocity =
      (spinProgress(accelFraction, accelFraction, decelPower) - before) / delta;
    const afterVelocity = (after - spinProgress(accelFraction, accelFraction, decelPower)) / delta;

    expect(Math.abs(beforeVelocity - afterVelocity) / beforeVelocity).toBeLessThan(0.01);
  });

  it('reaches a smooth stop and covers most distance early', () => {
    expect(1 - spinProgress(0.999, accelFraction, decelPower)).toBeLessThan(1e-9);
    expect(spinProgress(0.5, accelFraction, decelPower)).toBeGreaterThan(0.85);
  });
});
