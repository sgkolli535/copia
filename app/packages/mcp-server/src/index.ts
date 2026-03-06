// Barrel export of handlers + schemas for consumption by other packages.
// The MCP stdio server itself lives in server.ts.

export { handleParseUserProfile } from './tools/parse-user-profile.js';
export { handleGetApplicableRules } from './tools/get-applicable-rules.js';
export { handleComputeEstatePlan } from './tools/compute-estate-plan.js';
export { handleComputeScenarioDelta } from './tools/compute-scenario-delta.js';
export { handleGetJurisdictionInfo } from './tools/get-jurisdiction-info.js';
export { handleGetTreatyInfo } from './tools/get-treaty-info.js';
export { handleListSupportedJurisdictions } from './tools/list-supported-jurisdictions.js';
export { handleFlagUnknownEntity } from './tools/flag-unknown-entity.js';
export { handleAnalyzeMoneyEvent } from './tools/analyze-money-event.js';
export { handleCompareRepatriationScenarios } from './tools/compare-repatriation-scenarios.js';
export { handleMapPermittedActions } from './tools/map-permitted-actions.js';

export {
  ParseUserProfileInput,
  ComputeEstatePlanInput,
  ComputeScenarioDeltaInput,
  GetJurisdictionInfoInput,
  GetTreatyInfoInput,
  FlagUnknownEntityInput,
  MoneyEventInput,
  RepatriationScenarioInput,
  PermittedActionsInput,
} from './schemas/index.js';

export { getSession, clearSession } from './state/session-store.js';
