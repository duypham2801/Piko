import { DECISION_LIMITS } from '@piko/domain';
import type { DecisionDraftData, DecisionOptionData } from '@piko/domain';

export function makeOption(index: number, overrides: Partial<DecisionOptionData> = {}) {
  const option: DecisionOptionData = {
    id: `00000000-0000-4000-8000-${String(index + 2).padStart(12, '0')}`,
    label: `Option ${index + 1}`,
    weight: DECISION_LIMITS.weightDefault,
    enabled: true,
    ...overrides,
  };
  return option;
}

export function makeDraft(overrides: Partial<DecisionDraftData> = {}): DecisionDraftData {
  return {
    title: 'Dinner',
    options: [makeOption(0), makeOption(1)],
    ...overrides,
  };
}
