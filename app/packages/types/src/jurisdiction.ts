import type { CapitalControlRules } from './capital-mobility.js';

/** ISO 3166-1 alpha-2 codes for supported jurisdictions */
export type CountryCode = 'US' | 'GB' | 'IN' | 'PT';

export type CurrencyCode = 'USD' | 'GBP' | 'INR' | 'EUR';

export const COUNTRY_CURRENCIES: Record<CountryCode, CurrencyCode> = {
  US: 'USD',
  GB: 'GBP',
  IN: 'INR',
  PT: 'EUR',
} as const;

export interface TaxBracket {
  /** Lower bound (inclusive) in local currency */
  from: number;
  /** Upper bound (exclusive); null = no cap */
  to: number | null;
  /** Marginal rate as decimal (0.40 = 40%) */
  rate: number;
}

export interface Exemption {
  /** Human-readable name */
  name: string;
  /** Amount in local currency */
  amount: number;
  /** Conditions or notes */
  conditions: string;
  /** Citation */
  source: string;
}

export interface EstateTaxRules {
  /** Whether estate/inheritance tax exists */
  exists: boolean;
  /** Who is taxed: estate of deceased or individual inheritors */
  taxBase: 'estate' | 'inheritance' | 'none';
  /** Progressive brackets */
  brackets: TaxBracket[];
  /** Available exemptions */
  exemptions: Exemption[];
  /** Spousal provisions */
  spousalProvisions: SpousalProvision[];
  /** Special rules (e.g. PET 7-year rule, deemed domicile) */
  specialRules: SpecialRule[];
  /** Currency for all amounts */
  currency: CurrencyCode;
}

export interface GiftTaxRules {
  exists: boolean;
  annualExclusion: number;
  lifetimeExemption: number | null;
  spousalExclusion: number;
  nonCitizenSpousalExclusion: number;
  brackets: TaxBracket[];
  currency: CurrencyCode;
  specialRules: SpecialRule[];
}

export interface CapitalGainsTaxRules {
  exists: boolean;
  shortTermBrackets: TaxBracket[];
  longTermBrackets: TaxBracket[];
  /** Holding period threshold in months */
  holdingPeriodMonths: number;
  exemptions: Exemption[];
  currency: CurrencyCode;
}

export interface SpousalProvision {
  name: string;
  description: string;
  conditions: string;
  source: string;
}

export interface SpecialRule {
  id: string;
  name: string;
  description: string;
  /** Conditions that trigger this rule */
  trigger: string;
  /** Effect on liability */
  effect: string;
  source: string;
}

export interface ResidencyRule {
  /** Test type */
  testType: 'days' | 'statutory' | 'citizenship' | 'domicile';
  /** Days threshold if applicable */
  daysThreshold: number | null;
  /** Description of the test */
  description: string;
  /** Residency categories */
  categories: ResidencyCategory[];
  source: string;
}

export interface ResidencyCategory {
  id: string;
  name: string;
  description: string;
  /** Tax consequences */
  taxScope: 'worldwide' | 'domestic' | 'remittance';
}

export interface FilingObligation {
  name: string;
  description: string;
  /** Deadline description (e.g., "April 15 following tax year") */
  deadline: string;
  /** Penalty for non-filing */
  penalty: string;
  source: string;
}

export interface Jurisdiction {
  code: CountryCode;
  name: string;
  currency: CurrencyCode;
  residencyRules: ResidencyRule[];
  estateTax: EstateTaxRules;
  giftTax: GiftTaxRules;
  capitalGainsTax: CapitalGainsTaxRules;
  filingObligations: FilingObligation[];
  /** Capital control rules for cross-border fund movements */
  capitalControls?: CapitalControlRules;
  /** When this data was last updated */
  lastUpdated: string;
  /** Data source identifier */
  source: string;
  /** Known upcoming changes */
  sunsetProvisions: SunsetProvision[];
}

export interface SunsetProvision {
  name: string;
  description: string;
  effectiveDate: string;
  impact: string;
  source: string;
}
