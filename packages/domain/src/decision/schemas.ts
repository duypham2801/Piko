import * as z from 'zod/mini';

import { DECISION_LIMITS } from './limits.js';

const normalizedText = (maxLength: number) =>
  z.string().check(z.normalize('NFC'), z.trim(), z.minLength(1), z.maxLength(maxLength));

const emojiPattern =
  /^(?=.*\p{Extended_Pictographic})(?:\p{Extended_Pictographic}|\p{Emoji_Component}|\u200d|\ufe0f)+$/u;

export const DecisionOption = z.object({
  id: z.uuid(),
  label: normalizedText(DECISION_LIMITS.labelMaxLength),
  emoji: z.optional(
    z
      .string()
      .check(z.minLength(1), z.maxLength(DECISION_LIMITS.emojiMaxLength), z.regex(emojiPattern)),
  ),
  weight: z
    .number()
    .check(z.int(), z.minimum(DECISION_LIMITS.weightMin), z.maximum(DECISION_LIMITS.weightMax)),
  enabled: z.boolean(),
});

export type DecisionOptionData = z.infer<typeof DecisionOption>;

const categoryPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const DecisionBase = z.object({
  id: z.uuid(),
  title: normalizedText(DECISION_LIMITS.titleMaxLength),
  category: z.optional(
    z.string().check(z.regex(categoryPattern), z.maxLength(DECISION_LIMITS.categoryMaxLength)),
  ),
  options: z
    .array(DecisionOption)
    .check(z.minLength(DECISION_LIMITS.minOptions), z.maxLength(DECISION_LIMITS.maxOptions)),
});

type DecisionBaseData = z.infer<typeof DecisionBase>;

const uniqueOptionIds = z.superRefine<DecisionBaseData>((decision, context) => {
  const ids = decision.options.map((option) => option.id);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: 'custom', message: 'duplicate_option_id' });
  }
});

const uniqueOptionLabels = z.superRefine<DecisionBaseData>((decision, context) => {
  const labels = decision.options.map((option) => option.label.toLocaleLowerCase('vi'));
  if (new Set(labels).size !== labels.length) {
    context.addIssue({ code: 'custom', message: 'duplicate_option_label' });
  }
});

const enoughEnabledOptions = z.superRefine<DecisionBaseData>((decision, context) => {
  const enabledCount = decision.options.filter((option) => option.enabled).length;
  if (enabledCount < DECISION_LIMITS.minEnabledOptions) {
    context.addIssue({ code: 'custom', message: 'not_enough_enabled_options' });
  }
});

export const Decision = DecisionBase.check(
  uniqueOptionIds,
  uniqueOptionLabels,
  enoughEnabledOptions,
);

export type DecisionData = z.infer<typeof Decision>;
