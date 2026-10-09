export { ApiError } from './api/error.js';
export type { ApiError as ApiErrorData } from './api/error.js';
export { DecisionListResponse, DecisionRecord } from './api/decisions.js';
export type { DecisionListResponseData, DecisionRecordData } from './api/decisions.js';
export {
  HistoryEntry,
  HistoryEntryCreate,
  HistoryListResponse,
  HistorySource,
  HistorySourceInput,
} from './api/history.js';
export type {
  HistoryEntryCreateData,
  HistoryEntryData,
  HistoryListResponseData,
  HistorySourceData,
  HistorySourceInputData,
} from './api/history.js';
export {
  SHARE_LIFETIME_DAYS,
  ShareLifetime,
  SharedCase,
  SharedCaseCreate,
  SharedCaseListResponse,
  SharedCaseSpin,
} from './api/shares.js';
export type {
  SharedCaseCreateData,
  SharedCaseData,
  SharedCaseListResponseData,
  SharedCaseSpinData,
} from './api/shares.js';
export { HealthResponse } from './api/health.js';
export type { HealthResponse as HealthResponseData } from './api/health.js';
export { MeResponse } from './api/me.js';
export type { MeResponse as MeResponseData } from './api/me.js';
export { DECISION_LIMITS } from './decision/limits.js';
export { Decision, DecisionDraft, DecisionOption } from './decision/schemas.js';
export type { DecisionData, DecisionDraftData, DecisionOptionData } from './decision/schemas.js';
export { select } from './selection/select.js';
export { matchesSelection } from './selection/match.js';
export { Seed, SelectionResult, SELECTION_ALGORITHM } from './selection/result.js';
export type { SeedData, SelectionResultData } from './selection/result.js';
export { ANIMATION_PLAN_DEFAULTS, buildAnimationPlan, positionAt } from './animation-plan/plan.js';
export type { AnimationPlan, AnimationPlanParams } from './animation-plan/plan.js';
