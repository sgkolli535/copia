import type { CountryCode } from './jurisdiction.js';
import type { PlanResult } from './plan-result.js';

export type ModificationType =
  | 'relocate'
  | 'gift_asset'
  | 'restructure_ownership'
  | 'change_timing'
  | 'add_jurisdiction'
  | 'spousal_planning'
  | 'repatriate';

export interface ScenarioModification {
  id: string;
  type: ModificationType;
  /** Human-readable description */
  description: string;
  /** Specific parameters for this modification */
  params: ScenarioParams;
}

export type ScenarioParams =
  | RelocateParams
  | GiftAssetParams
  | RestructureOwnershipParams
  | ChangeTimingParams
  | AddJurisdictionParams
  | SpousalPlanningParams
  | RepatriateParams;

export interface RelocateParams {
  type: 'relocate';
  /** Person who relocates */
  personId: string;
  /** Target country */
  toCountry: CountryCode;
  /** Assumed days present after relocation */
  daysPresent: number;
  /** Year of relocation */
  year: number;
}

export interface GiftAssetParams {
  type: 'gift_asset';
  /** Asset to gift */
  assetId: string;
  /** Recipient */
  recipientId: string;
  /** Fraction to gift (0-1) */
  fraction: number;
}

export interface RestructureOwnershipParams {
  type: 'restructure_ownership';
  assetId: string;
  newOwnershipType: string;
  newOwnershipFraction: number;
}

export interface ChangeTimingParams {
  type: 'change_timing';
  /** What event changes timing */
  event: string;
  /** New year */
  year: number;
}

export interface AddJurisdictionParams {
  type: 'add_jurisdiction';
  country: CountryCode;
  daysPresent: number;
}

export interface SpousalPlanningParams {
  type: 'spousal_planning';
  /** Strategy type (e.g., 'qdot', 'marital_deduction') */
  strategy: string;
  /** Assets to include */
  assetIds: string[];
}

export interface RepatriateParams {
  type: 'repatriate';
  /** Source country of the funds */
  sourceCountry: CountryCode;
  /** Amount to repatriate */
  amount: number;
  /** Repatriation channel to use */
  channel: string;
  /** Year of repatriation */
  year: number;
}

export interface LiabilityDelta {
  jurisdiction: CountryCode;
  taxType: string;
  baselineAmount: number;
  scenarioAmount: number;
  deltaAmount: number;
  deltaPct: number;
}

export interface ScenarioDelta {
  id: string;
  /** Modification that produced this delta */
  modification: ScenarioModification;
  /** Baseline plan */
  baselinePlanId: string;
  /** Scenario plan */
  scenarioPlanId: string;
  /** Per-liability changes */
  liabilityDeltas: LiabilityDelta[];
  /** Net impact in reporting currency */
  netImpact: number;
  /** Conflicts that are new in the scenario */
  newConflicts: string[];
  /** Conflicts that are resolved in the scenario */
  resolvedConflicts: string[];
  /** New filing obligations */
  newObligations: string[];
  /** Removed filing obligations */
  removedObligations: string[];
  /** Trade-offs to highlight */
  tradeOffs: TradeOff[];
  computedAt: string;
}

export interface TradeOff {
  description: string;
  /** Positive aspects */
  pros: string[];
  /** Negative aspects */
  cons: string[];
  /** Net financial impact if quantifiable */
  financialImpact: number | null;
}
