import { describe, expect, it } from 'vitest';

import type { DecisionOptionData } from '../decision/schemas.js';
import { matchesSelection } from './match.js';
import { select } from './select.js';

const ids = [
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
] as const;

function makeOption(index: number, enabled = true): DecisionOptionData {
  return {
    id: ids[index] ?? ids[0],
    label: `Option ${index + 1}`,
    weight: 1,
    enabled,
  };
}

describe('matchesSelection', () => {
  const options = [makeOption(0), makeOption(1), makeOption(2)];

  it('accepts the output of select', () => {
    const result = select(options, 42);

    expect(matchesSelection(options, result)).toBe(true);
  });

  it('rejects a different winner', () => {
    const result = select(options, 42);
    const differentWinner = result.candidateIds.find((id) => id !== result.winnerId);

    if (!differentWinner) {
      throw new Error('Expected at least two candidates.');
    }
    expect(matchesSelection(options, { ...result, winnerId: differentWinner })).toBe(false);
  });

  it('rejects candidates that differ from enabled options', () => {
    const result = select(options, 42);

    expect(
      matchesSelection(
        options.map((option) => ({ ...option, enabled: false })),
        result,
      ),
    ).toBe(false);
  });
});
