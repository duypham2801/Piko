import * as z from 'zod/mini';

import { DECISION_LIMITS } from '../decision/limits.js';

export const SELECTION_ALGORITHM = 'weighted-v1' as const;

export const Seed = z.uint32();

export const SelectionResult = z.object({
  algorithm: z.literal(SELECTION_ALGORITHM),
  seed: Seed,
  winnerId: z.uuid(),
  candidateIds: z.array(z.uuid()).check(z.minLength(DECISION_LIMITS.minEnabledOptions)),
});

export type SeedData = z.infer<typeof Seed>;
export type SelectionResultData = z.infer<typeof SelectionResult>;
