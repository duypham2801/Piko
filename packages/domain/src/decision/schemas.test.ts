import { describe, expect, it } from 'vitest';

import { DECISION_LIMITS } from './limits.js';
import { Decision, DecisionOption, type DecisionOptionData } from './schemas.js';

const decisionId = '00000000-0000-4000-8000-000000000001';
const optionIds = [
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000004',
];

function makeOption(
  index: number,
  overrides: Partial<DecisionOptionData> = {},
): DecisionOptionData {
  return {
    id: optionIds[index] ?? `00000000-0000-4000-8000-${String(index + 2).padStart(12, '0')}`,
    label: `Option ${index + 1}`,
    weight: DECISION_LIMITS.weightDefault,
    enabled: true,
    ...overrides,
  };
}

function makeDecision(options: DecisionOptionData[] = [makeOption(0), makeOption(1)]) {
  return {
    id: decisionId,
    title: 'Dinner',
    category: 'food',
    options,
  };
}

describe('Decision schemas', () => {
  it('parses valid decisions and normalizes text to NFC and trim', () => {
    const result = Decision.safeParse({
      ...makeDecision([
        makeOption(0, { label: '  Phở  ' }),
        makeOption(1, { label: `Ba\u0301nh` }),
      ]),
      title: '  Tonight  ',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Tonight');
      expect(result.data.options[0]?.label).toBe('Phở');
      expect(result.data.options[1]?.label).toBe('Bánh');
    }
  });

  it('rejects option count outside the limits', () => {
    const tooFew = Array.from({ length: DECISION_LIMITS.minOptions - 1 }, (_, index) =>
      makeOption(index),
    );
    const tooMany = Array.from({ length: DECISION_LIMITS.maxOptions + 1 }, (_, index) =>
      makeOption(index),
    );

    expect(Decision.safeParse(makeDecision(tooFew)).success).toBe(false);
    expect(Decision.safeParse(makeDecision(tooMany)).success).toBe(false);
  });

  it('enforces label, title and weight limits', () => {
    expect(DecisionOption.safeParse(makeOption(0, { label: '' })).success).toBe(false);
    expect(DecisionOption.safeParse(makeOption(0, { label: '   ' })).success).toBe(false);
    expect(
      DecisionOption.safeParse(
        makeOption(0, { label: 'x'.repeat(DECISION_LIMITS.labelMaxLength + 1) }),
      ).success,
    ).toBe(false);
    expect(
      DecisionOption.safeParse(makeOption(0, { label: 'x'.repeat(DECISION_LIMITS.labelMaxLength) }))
        .success,
    ).toBe(true);
    expect(
      Decision.safeParse({
        ...makeDecision(),
        title: 'x'.repeat(DECISION_LIMITS.titleMaxLength + 1),
      }).success,
    ).toBe(false);

    for (const weight of [DECISION_LIMITS.weightMin - 1, DECISION_LIMITS.weightMax + 1, 2.5]) {
      expect(DecisionOption.safeParse(makeOption(0, { weight })).success).toBe(false);
    }
  });

  it('validates category slugs', () => {
    expect(Decision.safeParse({ ...makeDecision(), category: 'Food' }).success).toBe(false);
    expect(Decision.safeParse({ ...makeDecision(), category: 'food-' }).success).toBe(false);
  });

  it('accepts supported emoji sequences and rejects other text', () => {
    for (const emoji of ['🍜', '👍🏽', '👨‍👩‍👧']) {
      expect(DecisionOption.safeParse(makeOption(0, { emoji })).success).toBe(true);
    }
    for (const emoji of ['a', '12', '🍜 x']) {
      expect(DecisionOption.safeParse(makeOption(0, { emoji })).success).toBe(false);
    }
    expect(DecisionOption.safeParse(makeOption(0)).success).toBe(true);
  });

  it('reports stable cross-field issue messages', () => {
    const duplicateIds = Decision.safeParse(
      makeDecision([makeOption(0), makeOption(1, { id: optionIds[0] })]),
    );
    const duplicateLabels = Decision.safeParse(
      makeDecision([makeOption(0, { label: 'Phở' }), makeOption(1, { label: 'phở' })]),
    );
    const notEnoughEnabled = Decision.safeParse(
      makeDecision([makeOption(0), makeOption(1, { enabled: false })]),
    );

    expect(duplicateIds.success).toBe(false);
    expect(duplicateLabels.success).toBe(false);
    expect(notEnoughEnabled.success).toBe(false);
    if (!duplicateIds.success) {
      expect(duplicateIds.error.issues.map((issue) => issue.message)).toContain(
        'duplicate_option_id',
      );
    }
    if (!duplicateLabels.success) {
      expect(duplicateLabels.error.issues.map((issue) => issue.message)).toContain(
        'duplicate_option_label',
      );
    }
    if (!notEnoughEnabled.success) {
      expect(notEnoughEnabled.error.issues.map((issue) => issue.message)).toContain(
        'not_enough_enabled_options',
      );
    }
  });
});
