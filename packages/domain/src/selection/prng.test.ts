import { describe, expect, it } from 'vitest';

import { createRng } from './prng.js';

describe('createRng', () => {
  it.each([
    [0, [0.26642920868471265, 0.0003297457005828619, 0.2232720274478197]],
    [1, [0.6270739405881613, 0.002735721180215478, 0.5274470399599522]],
    [42, [0.6011037519201636, 0.44829055899754167, 0.8524657934904099]],
    [4294967295, [0.8964226141106337, 0.189478256739676, 0.7156526781618595]],
  ])('matches golden values for seed %d', (seed, expected) => {
    const rng = createRng(seed);

    expect(rng()).toBe(expected[0]);
    expect(rng()).toBe(expected[1]);
    expect(rng()).toBe(expected[2]);
  });

  it('creates independent identical streams for the same seed', () => {
    const first = createRng(7);
    const second = createRng(7);

    for (let index = 0; index < 10; index += 1) {
      expect(first()).toBe(second());
    }
  });

  it('always returns values in the half-open unit interval', () => {
    const rng = createRng(123456789);

    for (let index = 0; index < 10_000; index += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
