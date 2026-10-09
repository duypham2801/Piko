import * as z from 'zod/mini';

import { DecisionDraft, DecisionOption } from '../decision/schemas.js';
import { SelectionResult } from '../selection/result.js';

const presetSlug = z.string().check(z.regex(/^[a-z0-9-]{1,32}$/));

export const HistorySourceInput = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('decision'), decisionId: z.uuid() }),
  z.object({ kind: z.literal('preset'), slug: presetSlug }),
  z.object({ kind: z.literal('draft') }),
]);

export type HistorySourceInputData = z.infer<typeof HistorySourceInput>;

export const HistoryEntryCreate = z.object({
  source: HistorySourceInput,
  decision: DecisionDraft,
  result: SelectionResult,
});

export type HistoryEntryCreateData = z.infer<typeof HistoryEntryCreate>;

export const HistorySource = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('decision'), decisionId: z.nullable(z.uuid()) }),
  z.object({ kind: z.literal('preset'), slug: presetSlug }),
  z.object({ kind: z.literal('draft') }),
]);

export type HistorySourceData = z.infer<typeof HistorySource>;

export const HistoryEntry = z.object({
  id: z.uuid(),
  source: HistorySource,
  title: z.string(),
  winner: DecisionOption,
  createdAt: z.iso.datetime(),
});

export type HistoryEntryData = z.infer<typeof HistoryEntry>;

export const HistoryListResponse = z.object({
  entries: z.array(HistoryEntry),
});

export type HistoryListResponseData = z.infer<typeof HistoryListResponse>;
