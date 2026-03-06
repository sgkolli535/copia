import type { CountryCode, CurrencyCode } from './jurisdiction.js';

export type TreatyPair = `${CountryCode}-${CountryCode}`;

export type TaxingRight = 'exclusive_residence' | 'exclusive_source' | 'shared' | 'not_covered';

export type ReliefMethod = 'credit' | 'exemption' | 'exemption_with_progression' | 'none';

export type AssetClass =
  | 'immovable_property'
  | 'business_property'
  | 'shares'
  | 'bonds'
  | 'bank_deposits'
  | 'personal_property'
  | 'pension'
  | 'life_insurance'
  | 'other';

export interface TaxingRightEntry {
  assetClass: AssetClass;
  right: TaxingRight;
  /** Which country has primary/exclusive right */
  primaryCountry: CountryCode | null;
  /** Treaty article reference */
  articleRef: string;
  notes: string;
}

export interface TieBreakerRule {
  /** Order in the tie-breaker cascade */
  order: number;
  /** Test name */
  test: string;
  /** Description */
  description: string;
  /** Treaty article */
  articleRef: string;
}

export interface SpecialTreatyProvision {
  id: string;
  name: string;
  description: string;
  /** Which country's provision */
  country: CountryCode;
  /** Effect on the treaty */
  effect: string;
  articleRef: string;
}

export interface TreatyEdge {
  /** Alphabetically ordered pair */
  pair: TreatyPair;
  countries: [CountryCode, CountryCode];
  /** Treaty name and year */
  treatyName: string;
  /** Year signed */
  yearSigned: number;
  /** Whether MLI applies */
  mliApplies: boolean;
  /** Per-asset-class taxing rights */
  taxingRights: TaxingRightEntry[];
  /** Relief method */
  reliefMethod: ReliefMethod;
  /** Tie-breaker rules for dual residency */
  tieBreakerRules: TieBreakerRule[];
  /** Special provisions (e.g., US saving clause) */
  specialProvisions: SpecialTreatyProvision[];
  /** Known gaps in coverage */
  gaps: TreatyGap[];
  /** Data source */
  source: string;
  lastUpdated: string;
}

export interface TreatyGap {
  description: string;
  /** Asset classes affected */
  affectedAssetClasses: AssetClass[];
  /** Potential double taxation risk */
  riskLevel: 'high' | 'medium' | 'low';
  /** Suggested mitigation */
  mitigation: string;
}
