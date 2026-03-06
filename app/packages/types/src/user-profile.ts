import type { CountryCode, CurrencyCode } from './jurisdiction.js';
import type { AssetClass } from './treaty.js';

export type OwnershipType = 'sole' | 'joint_tenancy' | 'tenancy_in_common' | 'community_property' | 'trust';

export type RelationshipType = 'spouse' | 'child' | 'parent' | 'sibling' | 'other';

export interface Residency {
  country: CountryCode;
  /** Days present in the current/relevant tax year */
  daysPresent: number;
  /** Whether legally domiciled here */
  isDomiciled: boolean;
  /** Years of continuous residency */
  yearsResident: number;
  /** Visa/immigration status if relevant */
  status: string;
}

export interface Asset {
  id: string;
  name: string;
  /** Asset classification for treaty purposes */
  assetClass: AssetClass;
  /** Country where the asset is situated */
  spikeLocation: CountryCode;
  /** Current fair market value */
  value: number;
  /** Currency of valuation */
  currency: CurrencyCode;
  /** Cost basis for CGT */
  costBasis: number;
  /** How the asset is owned */
  ownershipType: OwnershipType;
  /** Fraction owned (0-1) if shared ownership */
  ownershipFraction: number;
  /** Date acquired (ISO) */
  dateAcquired: string;
  /** Additional notes */
  notes: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  relationship: RelationshipType;
  /** Citizenship(s) */
  citizenships: CountryCode[];
  /** Current residency */
  residency: Residency | null;
  /** Whether this person is a beneficiary */
  isBeneficiary: boolean;
  /** Age (for minority/age-based rules) */
  age: number;
}

export interface UserProfile {
  id: string;
  /** Primary person's name */
  name: string;
  /** Age */
  age: number;
  /** Citizenship(s) — critical for US citizenship-based taxation */
  citizenships: CountryCode[];
  /** All residencies */
  residencies: Residency[];
  /** All assets */
  assets: Asset[];
  /** Family members */
  family: FamilyMember[];
  /** Preferred reporting currency */
  reportingCurrency: CurrencyCode;
  /** Profile creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}
