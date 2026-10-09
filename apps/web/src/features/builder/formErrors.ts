import type { DecisionDraftData } from '@piko/domain';

import { t } from '../../i18n';

export type FormErrors = {
  title?: string;
  options: Record<string, string>;
  form?: string;
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
  let form: string | undefined;
  const options: Record<string, string> = {};

  for (const issue of issues) {
    const [first, second, third] = issue.path;

    if (first === 'title' && issue.path.length === 1) {
      if (issue.code === 'too_small') {
        title = t('titleRequired');
      } else if (issue.code === 'too_big') {
        title = t('titleTooLong');
      } else {
        form = t('formInvalid');
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
        form = t('formInvalid');
      } else if (issue.code === 'too_small') {
        options[option.id] = t('optionRequired');
      } else if (issue.code === 'too_big') {
        options[option.id] = t('optionTooLong');
      } else {
        form = t('formInvalid');
      }
      continue;
    }

    if (issue.message !== 'duplicate_option_label') {
      form = t('formInvalid');
    }
  }

  const duplicateGroups = new Map<string, string[]>();
  for (const option of state.options) {
    const normalized = option.label.normalize('NFC').trim().toLocaleLowerCase('vi');
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

  return { form, options, title };
}
