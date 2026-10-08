import { describe, expect, it, vi } from 'vitest';

import { pickWeighted } from './weighted.js';

describe('pickWeighted', () => {
  it('rejects an empty list', () => {
    expect(() => pickWeighted([], () => 0)).toThrow('Weighted pick requires at least one item.');
  });

  it('rejects invalid weights before consuming the rng', () => {
    const rng = vi.fn(() => 0.5);

    expect(() => pickWeighted([{ weight: 0 }], rng)).toThrow(
      'Weighted pick requires positive integer weights.',
    );
    expect(rng).not.toHaveBeenCalled();
  });
});
