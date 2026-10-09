import { DECISION_LIMITS } from '@piko/domain';
import type { DecisionDraftData, DecisionOptionData, DecisionRecordData } from '@piko/domain';

import type { Preset } from '../presets/presets';

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

export function normalizeLabel(label: string): string {
  return label.normalize('NFC').trim().toLocaleLowerCase('vi');
}

export function draftFromPreset(preset: Preset): DecisionDraftData {
  return {
    options: preset.decision.options.map((option) => ({
      ...emptyOption(),
      label: option.label,
      emoji: option.emoji,
    })),
    title: preset.decision.title,
  };
}

export function withCopiedOption(
  draft: DecisionDraftData,
  source: Pick<DecisionOptionData, 'label' | 'emoji'>,
): DecisionDraftData {
  const emptyIndex = draft.options.findIndex((option) => !option.label.trim() && !option.emoji);
  if (emptyIndex >= 0) {
    return {
      ...draft,
      options: draft.options.map((option, index) =>
        index === emptyIndex ? { ...option, emoji: source.emoji, label: source.label } : option,
      ),
    };
  }

  return {
    ...draft,
    options: [...draft.options, { ...emptyOption(), label: source.label, emoji: source.emoji }],
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
