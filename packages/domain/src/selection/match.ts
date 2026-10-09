import type { DecisionOptionData } from '../decision/schemas.js';
import { select } from './select.js';
import type { SelectionResultData } from './result.js';

export function matchesSelection(
  options: readonly DecisionOptionData[],
  result: SelectionResultData,
): boolean {
  try {
    const expected = select(options, result.seed);
    return (
      expected.algorithm === result.algorithm &&
      expected.winnerId === result.winnerId &&
      expected.candidateIds.length === result.candidateIds.length &&
      expected.candidateIds.every((id, index) => id === result.candidateIds[index])
    );
  } catch {
    return false;
  }
}
