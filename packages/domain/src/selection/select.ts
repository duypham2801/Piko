import { DECISION_LIMITS } from '../decision/limits.js';
import type { DecisionOptionData } from '../decision/schemas.js';
import { Seed, SELECTION_ALGORITHM } from './result.js';
import type { SelectionResultData } from './result.js';
import { createRng } from './prng.js';
import { pickWeighted } from './weighted.js';

export function select(options: readonly DecisionOptionData[], seed: number): SelectionResultData {
  const candidates = options.filter((option) => option.enabled);
  if (candidates.length < DECISION_LIMITS.minEnabledOptions) {
    throw new RangeError('At least two enabled options are required.');
  }

  const parsedSeed = Seed.safeParse(seed);
  if (!parsedSeed.success) {
    throw new RangeError('Seed must be an unsigned 32-bit integer.');
  }

  const winnerId = pickWeighted(candidates, createRng(parsedSeed.data)).id;

  return {
    algorithm: SELECTION_ALGORITHM,
    seed: parsedSeed.data,
    winnerId,
    candidateIds: candidates.map((candidate) => candidate.id),
  };
}
