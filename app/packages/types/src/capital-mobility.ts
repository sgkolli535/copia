import type { CountryCode, CurrencyCode } from './jurisdiction.js';
import type { ConfidenceTier, SourceCitation } from './citation.js';
import type { AuditEntry } from './plan-result.js';

// ---------------------------------------------------------------------------
// Money event types
// ---------------------------------------------------------------------------

export type MoneyEventType =
  | 'inheritance'
  | 'property_sale'
  | 'business_exit'
  | 'pension'
  | 'settlement'
  | 'gift'
  | 'investment_liquidation';

export type ResidencyStatus =
  | 'citizen'
  | 'former_citizen'
  | 'nri'
  | 'oci'
  | 'pio'
  | 'non_resident'
  | 'deemed_domiciled'
  | 'non_domiciled'
  | 'resident';

export interface MoneyEvent {
  id: string;
  type: MoneyEventType;
  sourceCountry: CountryCode;
  destinationCountry: CountryCode;
  amount: number;
  currency: CurrencyCode;
  date: string;
  relatedAsset: string;
  relationship: string;
  userStatusInSource: ResidencyStatus;
  description: string;
}

// ---------------------------------------------------------------------------
// Capital controls building blocks
// ---------------------------------------------------------------------------

export interface OutboundLimit {
  name: string;
  annualLimitUSD: number | null;
  perTransactionLimitUSD: number | null;
  conditions: string;
  source: string;
}

export type AccountType = 'NRO' | 'NRE' | 'FCNR' | 'standard' | 'investment' | 'other';

export interface AccountRequirement {
  accountType: AccountType;
  description: string;
  restrictions: string;
  repatriable: boolean;
  source: string;
}

export interface ApprovalThreshold {
  name: string;
  thresholdUSD: number;
  authority: string;
  documentation: string[];
  timelineWeeks: number;
  source: string;
}

export interface CapitalControlRules {
  hasControls: boolean;
  outboundLimits: OutboundLimit[];
  accountRequirements: AccountRequirement[];
  approvalThresholds: ApprovalThreshold[];
  documentationRequired: string[];
  exemptions: string[];
  source: string;
}

// ---------------------------------------------------------------------------
// 5-layer cost stack
// ---------------------------------------------------------------------------

export interface TaxLayer {
  layer: 'source_tax' | 'destination_tax' | 'treaty_relief' | 'transfer_costs' | 'timing';
  name: string;
  amount: number;
  rate: number;
  currency: CurrencyCode;
  description: string;
  citations: SourceCitation[];
  confidence: ConfidenceTier;
}

export interface TaxLayerResult {
  layers: TaxLayer[];
  totalCost: number;
  effectiveRate: number;
  netAmount: number;
  currency: CurrencyCode;
}

// ---------------------------------------------------------------------------
// Repatriation channels
// ---------------------------------------------------------------------------

export interface RepatriationChannel {
  id: string;
  name: string;
  description: string;
  constraints: string[];
  costLayers: TaxLayer[];
  totalCost: number;
  timeline: string;
  documentation: string[];
  annualLimit: number | null;
  recommended: boolean;
  citations: SourceCitation[];
}

// ---------------------------------------------------------------------------
// Permitted actions
// ---------------------------------------------------------------------------

export type ActionCategory = 'source_country' | 'destination_country' | 'third_country';

export interface PermittedAction {
  id: string;
  name: string;
  category: ActionCategory;
  country: CountryCode;
  permitted: boolean;
  restrictions: string[];
  taxConsequences: string[];
  filingObligations: string[];
  repatriability: 'full' | 'partial' | 'none';
  timeConstraints: string | null;
  citations: SourceCitation[];
  confidence: ConfidenceTier;
}

// ---------------------------------------------------------------------------
// Status result (from status determination step)
// ---------------------------------------------------------------------------

export interface StatusResult {
  sourceCountry: CountryCode;
  status: ResidencyStatus;
  description: string;
  citations: SourceCitation[];
  confidence: ConfidenceTier;
}

// ---------------------------------------------------------------------------
// Control result (from capital controls analysis step)
// ---------------------------------------------------------------------------

export interface ControlResult {
  hasControls: boolean;
  outboundLimits: OutboundLimit[];
  accountRequirements: AccountRequirement[];
  approvalRequired: boolean;
  approvalThresholds: ApprovalThreshold[];
  documentationRequired: string[];
  exemptions: string[];
  citations: SourceCitation[];
}

// ---------------------------------------------------------------------------
// Full mobility analysis result
// ---------------------------------------------------------------------------

export interface MobilityAnalysisResult {
  id: string;
  event: MoneyEvent;
  status: StatusResult;
  controls: ControlResult;
  taxLayers: TaxLayerResult;
  channels: RepatriationChannel[];
  permittedActions: PermittedAction[];
  auditTrail: AuditEntry[];
  computedAt: string;
  engineVersion: string;
}
