import * as z from 'zod/mini';

import { DECISION_LIMITS } from '../decision/limits.js';
import { DecisionDraft, DecisionOption } from '../decision/schemas.js';
import { SelectionResult } from '../selection/result.js';

export const SHARE_LIFETIME_DAYS = {
  '1d': 1,
  '7d': 7,
  '30d': 30,
  never: null,
} as const;

export const ShareLifetime = z.enum(['1d', '7d', '30d', 'never']);

const spinOptions = z
  .array(DecisionOption)
  .check(z.minLength(DECISION_LIMITS.minOptions), z.maxLength(DECISION_LIMITS.maxOptions));

export const SharedCaseCreate = z.object({
  decision: DecisionDraft,
  result: z.nullable(SelectionResult),
  lifetime: ShareLifetime,
});

export type SharedCaseCreateData = z.infer<typeof SharedCaseCreate>;

export const SharedCaseSpin = z.object({
  options: spinOptions,
  result: SelectionResult,
});

export type SharedCaseSpinData = z.infer<typeof SharedCaseSpin>;

export const SharedCase = z.object({
  id: z.uuid(),
  title: z.string(),
  category: z.optional(z.string()),
  options: z.array(DecisionOption),
  result: z.nullable(SelectionResult),
  spunAt: z.nullable(z.iso.datetime()),
  createdAt: z.iso.datetime(),
  expiresAt: z.nullable(z.iso.datetime()),
});

export type SharedCaseData = z.infer<typeof SharedCase>;

export const SharedCaseListResponse = z.object({ shares: z.array(SharedCase) });

export type SharedCaseListResponseData = z.infer<typeof SharedCaseListResponse>;
