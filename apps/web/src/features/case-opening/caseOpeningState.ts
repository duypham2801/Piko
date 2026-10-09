import type { AnimationPlan, DecisionOptionData, SelectionResultData } from '@piko/domain';

export type CaseOpeningState =
  | { status: 'ready' }
  | {
      status: 'spinning';
      plan: AnimationPlan;
      result: SelectionResultData;
      options: DecisionOptionData[];
    }
  | {
      status: 'revealed';
      plan: AnimationPlan;
      result: SelectionResultData;
      options: DecisionOptionData[];
    };

export type CaseOpeningEvent =
  | {
      type: 'open';
      plan: AnimationPlan;
      result: SelectionResultData;
      options: readonly DecisionOptionData[];
    }
  | { type: 'reveal' };

export function caseOpeningReducer(
  state: CaseOpeningState,
  event: CaseOpeningEvent,
): CaseOpeningState {
  if (event.type === 'open') {
    return state.status === 'spinning'
      ? state
      : {
          status: 'spinning',
          plan: event.plan,
          result: event.result,
          options: [...event.options],
        };
  }

  return state.status === 'spinning' ? { ...state, status: 'revealed' } : state;
}
