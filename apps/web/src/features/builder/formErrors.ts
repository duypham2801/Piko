import type { DecisionDraftData } from '@piko/domain';

import { t } from '../../i18n';
import { normalizeLabel } from './draft';

export type FormErrors = {
  title?: string;
  options: Record<string, string>;
};

type ValidationIssue = {
  code: string;
  message: string;
  path: readonly PropertyKey[];
};

export function getFormErrors(
  issues: readonly ValidationIssue[],
  state: DecisionDraftData,
): FormErrors {
  let title: string | undefined;
  const options: Record<string, string> = {};

  for (const issue of issues) {
    const [first, second, third] = issue.path;

    if (first === 'title' && issue.path.length === 1) {
      if (issue.code === 'too_small') {
        title = t('titleRequired');
      } else if (issue.code === 'too_big') {
        title = t('titleTooLong');
      }
      continue;
    }

    if (
      first === 'options' &&
      typeof second === 'number' &&
      third === 'label' &&
      issue.path.length === 3
    ) {
      const option = state.options[second];
      if (!option) {
        continue;
      }

      if (issue.code === 'too_small') {
        options[option.id] = t('optionRequired');
      } else if (issue.code === 'too_big') {
        options[option.id] = t('optionTooLong');
      }
      continue;
    }
  }

  const duplicateGroups = new Map<string, string[]>();
  for (const option of state.options) {
    const normalized = normalizeLabel(option.label);
    if (!normalized) {
      continue;
    }

    const group = duplicateGroups.get(normalized) ?? [];
    group.push(option.id);
    duplicateGroups.set(normalized, group);
  }

  for (const group of duplicateGroups.values()) {
    if (group.length < 2) {
      continue;
    }

    for (const optionId of group) {
      if (!options[optionId]) {
        options[optionId] = t('optionDuplicate');
      }
    }
  }

  return { options, title };
}
