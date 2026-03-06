import type { CountryCode, CurrencyCode } from './jurisdiction.js';
import type { TreatyPair, AssetClass, ReliefMethod } from './treaty.js';
import type { ConfidenceTier, SourceCitation } from './citation.js';

export interface Liability {
  id: string;
  /** Which jurisdiction imposes this liability */
  jurisdiction: CountryCode;
  /** Type of tax */
  taxType: 'estate' | 'inheritance' | 'gift' | 'capital_gains' | 'stamp_duty';
  /** Gross liability before relief */
  grossAmount: number;
  /** Treaty relief applied */
  reliefAmount: number;
  /** Net liability after relief */
  netAmount: number;
  /** Currency */
  currency: CurrencyCode;
  /** Effective rate */
  effectiveRate: number;
  /** Assets this liability applies to */
  applicableAssets: string[];
  /** Confidence tier */
  confidence: ConfidenceTier;
  /** Supporting citations */
  citations: SourceCitation[];
  /** Calculation breakdown */
  breakdown: CalculationStep[];
}

export interface CalculationStep {
  description: string;
  amount: number;
  currency: CurrencyCode;
  formula: string;
}

export interface Conflict {
  id: string;
  /** Jurisdictions in conflict */
  jurisdictions: CountryCode[];
  /** What's conflicting */
  description: string;
  /** Affected asset classes */
  affectedAssets: AssetClass[];
  /** Potential additional exposure */
  exposureAmount: number;
  currency: CurrencyCode;
  /** How this might be resolved */
  resolution: string;
  /** Applicable treaty if any */
  treaty: TreatyPair | null;
  confidence: ConfidenceTier;
  citations: SourceCitation[];
}

export interface TreatyApplication {
  treaty: TreatyPair;
  reliefMethod: ReliefMethod;
  /** Per-asset relief details */
  reliefDetails: ReliefDetail[];
  /** Total relief in reporting currency */
  totalRelief: number;
  currency: CurrencyCode;
}

export interface ReliefDetail {
  assetClass: AssetClass;
  assetIds: string[];
  grossLiability: number;
  reliefApplied: number;
  netLiability: number;
  method: ReliefMethod;
  articleRef: string;
}

export interface AuditEntry {
  /** Pipeline step that generated this entry */
  step: string;
  /** Timestamp */
  timestamp: string;
  /** What was determined */
  determination: string;
  /** Inputs to this step */
  inputs: Record<string, unknown>;
  /** Outputs from this step */
  outputs: Record<string, unknown>;
  /** Citations used */
  citations: SourceCitation[];
  /** Engine version */
  engineVersion: string;
}

export interface PlanResult {
  id: string;
  /** Profile ID this plan is for */
  profileId: string;
  /** Computed liabilities */
  liabilities: Liability[];
  /** Total exposure in reporting currency */
  totalExposure: number;
  /** Reporting currency */
  reportingCurrency: CurrencyCode;
  /** Identified conflicts */
  conflicts: Conflict[];
  /** Treaty applications */
  treatyApplications: TreatyApplication[];
  /** Filing obligations */
  filingObligations: FilingObligation[];
  /** Full audit trail */
  auditTrail: AuditEntry[];
  /** Computation timestamp */
  computedAt: string;
  /** Engine version */
  engineVersion: string;
  /** Prompt version used for any AI narration */
  promptVersion: string;
  /** Exchange rates used */
  exchangeRates: ExchangeRateSnapshot[];
  /** Data staleness warnings from the data-service layer */
  warnings: string[];
}

export interface FilingObligation {
  jurisdiction: CountryCode;
  name: string;
  description: string;
  deadline: string;
  penalty: string;
  confidence: ConfidenceTier;
  citations: SourceCitation[];
}

export interface ExchangeRateSnapshot {
  from: CurrencyCode;
  to: CurrencyCode;
  rate: number;
  asOf: string;
  source: string;
}
