// -----------------------------------------------------------------------
// Main orchestrator -- re-export from compute-estate-plan
// -----------------------------------------------------------------------
export { computeEstatePlan } from './compute-estate-plan.js';

// -----------------------------------------------------------------------
// Pipeline steps
// -----------------------------------------------------------------------
export { determineResidency } from './pipeline/01-residency.js';
export { identifyTreaties } from './pipeline/02-treaties.js';
export { resolveTieBreakers } from './pipeline/03-tie-breaker.js';
export { calculateDomesticLiabilities } from './pipeline/04-domestic.js';
export { applyTreatyRelief } from './pipeline/05-relief.js';
export { detectTrilateralGaps } from './pipeline/06-trilateral.js';
export { consolidateResult } from './pipeline/07-consolidate.js';

// -----------------------------------------------------------------------
// Calculators
// -----------------------------------------------------------------------
export {
  applyBrackets,
  calculateUSEstateTax,
  calculateUKIHT,
  calculateIndiaStampDuty,
  calculatePortugalStampDuty,
  convertAmount,
} from './calculators/tax.js';
export {
  buildExchangeRateMap,
  getRate,
  convert,
  rateKey,
} from './calculators/currency.js';

// -----------------------------------------------------------------------
// Validators
// -----------------------------------------------------------------------
export { validateProfile } from './validators/profile-validator.js';

// -----------------------------------------------------------------------
// Data registry
// -----------------------------------------------------------------------
export {
  loadProfileJurisdictions,
  loadProfileTreaties,
  loadExchangeRates,
} from './data/registry.js';

// -----------------------------------------------------------------------
// Scenario module
// -----------------------------------------------------------------------
export { applyModification, computeDelta, analyzeScenario } from './scenario/index.js';

// -----------------------------------------------------------------------
// Mobility module
// -----------------------------------------------------------------------
export {
  analyzeMoneyEvent,
  compareRepatriationScenarios,
  determineSourceCountryStatus,
  analyzeCapitalControls,
  computeTaxLayers,
  buildRepatriationChannels,
  mapPermittedActions,
} from './mobility/index.js';

// -----------------------------------------------------------------------
// Pipeline types (re-exported for consumers)
// -----------------------------------------------------------------------
export type { ResidencyDetermination } from './pipeline/01-residency.js';
export type { ApplicableTreaty } from './pipeline/02-treaties.js';
export type { TieBreakerResult } from './pipeline/03-tie-breaker.js';
export type { TrilateralGap } from './pipeline/06-trilateral.js';
export type { ValidationResult, ValidationError } from './validators/profile-validator.js';
