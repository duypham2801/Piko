import * as z from 'zod/mini';

import { Decision } from '../decision/schemas.js';

export const DecisionRecord = z.object({
  decision: Decision,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type DecisionRecordData = z.infer<typeof DecisionRecord>;

export const DecisionListResponse = z.object({
  decisions: z.array(DecisionRecord),
});

export type DecisionListResponseData = z.infer<typeof DecisionListResponse>;
