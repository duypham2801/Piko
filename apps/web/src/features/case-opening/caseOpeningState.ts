import type { AnimationPlan, SelectionResultData } from '@piko/domain';

export type CaseOpeningState =
  | { status: 'ready' }
  | { status: 'spinning'; plan: AnimationPlan; result: SelectionResultData }
  | { status: 'revealed'; plan: AnimationPlan; result: SelectionResultData };

export type CaseOpeningEvent =
  | { type: 'open'; plan: AnimationPlan; result: SelectionResultData }
  | { type: 'reveal' }
  | { type: 'reset' };

export function caseOpeningReducer(
  state: CaseOpeningState,
  event: CaseOpeningEvent,
): CaseOpeningState {
  if (event.type === 'reset') {
    return { status: 'ready' };
  }

  if (event.type === 'open') {
    return state.status === 'spinning'
      ? state
      : { status: 'spinning', plan: event.plan, result: event.result };
  }

  return state.status === 'spinning' ? { ...state, status: 'revealed' } : state;
}
