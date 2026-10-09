import { DECISION_LIMITS } from '@piko/domain';
import type { DecisionDraftData, DecisionRecordData } from '@piko/domain';

export function emptyOption(): DecisionDraftData['options'][number] {
  return {
    id: crypto.randomUUID(),
    label: '',
    weight: DECISION_LIMITS.weightDefault,
    enabled: true,
  };
}

export function emptyDraft(): DecisionDraftData {
  return {
    title: '',
    options: [emptyOption(), emptyOption()],
  };
}

export function draftOf(record: DecisionRecordData): DecisionDraftData {
  return {
    category: record.decision.category,
    options: record.decision.options.map((option) => ({ ...option })),
    title: record.decision.title,
  };
}

export function optionInputId(optionId: string): string {
  return `decision-option-${optionId}`;
}
