import { DECISION_LIMITS } from '@piko/domain';
import type { DecisionOptionData } from '@piko/domain';

export function parseOff(value: string | null, optionCount: number): ReadonlySet<number> {
  if (!value) {
    return new Set();
  }

  const off = new Set<number>();
  for (const token of value.split(',')) {
    if (!/^\d+$/.test(token)) {
      continue;
    }

    const index = Number(token);
    if (index < optionCount) {
      off.add(index);
    }
  }

  return optionCount - off.size < DECISION_LIMITS.minEnabledOptions ? new Set() : off;
}

export function formatOff(off: ReadonlySet<number>): string {
  return [...off].sort((left, right) => left - right).join(',');
}

export function applyOff(
  options: readonly DecisionOptionData[],
  off: ReadonlySet<number>,
): DecisionOptionData[] {
  return options.map((option, index) => ({ ...option, enabled: !off.has(index) }));
}
