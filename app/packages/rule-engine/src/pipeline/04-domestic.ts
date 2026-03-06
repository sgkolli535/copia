import type {
  UserProfile,
  CountryCode,
  CurrencyCode,
  Jurisdiction,
  Liability,
  CalculationStep,
  ConfidenceTier,
  SourceCitation,
} from '@copia/types';
import type { AuditEntry } from '@copia/types';
import type { ResidencyDetermination } from './01-residency.js';
import {
  calculateUSEstateTax,
  calculateUKIHT,
  calculateIndiaStampDuty,
  calculatePortugalStampDuty,
  convertAmount,
} from '../calculators/tax.js';
import { getRate } from '../calculators/currency.js';

const ENGINE_VERSION = '1.0.0';

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

let liabilityCounter = 0;

function nextLiabilityId(): string {
  liabilityCounter += 1;
  return `liability-${liabilityCounter.toString().padStart(4, '0')}`;
}

function makeCitation(
  jurisdiction: CountryCode,
  title: string,
  reference: string,
  confidence: ConfidenceTier,
): SourceCitation {
  return {
    id: `cit-domestic-${jurisdiction}-${reference.replace(/[^a-zA-Z0-9]/g, '')}`,
    sourceType: 'statute',
    title,
    reference,
    url: null,
    confidence,
    asOfDate: new Date().toISOString().slice(0, 10),
    jurisdiction,
  };
}

/**
 * Sum the value of all assets sited in a jurisdiction, converting to
 * the jurisdiction's local currency using the provided rate map.
 */
function sumAssetsInJurisdiction(
  profile: UserProfile,
  code: CountryCode,
  targetCurrency: CurrencyCode,
  exchangeRates: Map<string, number>,
): { total: number; assetIds: string[] } {
  let total = 0;
  const assetIds: string[] = [];

  for (const asset of profile.assets) {
    if (asset.spikeLocation === code) {
      const ownedValue = asset.value * asset.ownershipFraction;
      const converted = asset.currency === targetCurrency
        ? ownedValue
        : convertAmount(ownedValue, getRate(exchangeRates, asset.currency, targetCurrency));
      total += converted;
      assetIds.push(asset.id);
    }
  }

  return { total, assetIds };
}

/**
 * Sum the total worldwide estate value for a person, converting
 * everything to the given target currency.
 */
function sumWorldwideEstate(
  profile: UserProfile,
  targetCurrency: CurrencyCode,
  exchangeRates: Map<string, number>,
): { total: number; assetIds: string[] } {
  let total = 0;
  const assetIds: string[] = [];

  for (const asset of profile.assets) {
    const ownedValue = asset.value * asset.ownershipFraction;
    const converted = asset.currency === targetCurrency
      ? ownedValue
      : convertAmount(ownedValue, getRate(exchangeRates, asset.currency, targetCurrency));
    total += converted;
    assetIds.push(asset.id);
  }

  return { total, assetIds };
}

// -----------------------------------------------------------------------
// Per-jurisdiction liability calculators
// -----------------------------------------------------------------------

function calculateUSLiabilities(
  profile: UserProfile,
  determinations: ResidencyDetermination[],
  jurisdiction: Jurisdiction,
  exchangeRates: Map<string, number>,
): Liability[] {
  const liabilities: Liability[] = [];
  const primaryDet = determinations.find(
    (d) => d.personId === profile.id && d.jurisdiction === 'US',
  );

  if (!primaryDet) return liabilities;

  const isCitizen = primaryDet.residencyCategory === 'us-citizen';
  const isResident = primaryDet.isResident;
  const isNRA = primaryDet.residencyCategory === 'us-nonresident-alien';

  // Determine if the spouse is a US citizen (for marital deduction)
  const spouse = profile.family.find((m) => m.relationship === 'spouse');
  const isCitizenSpouse = spouse ? spouse.citizenships.includes('US') : false;

  let estateValue: number;
  let assetIds: string[];
  let exemption: number;

  if (isCitizen || isResident) {
    // Worldwide estate
    const worldwide = sumWorldwideEstate(profile, 'USD', exchangeRates);
    estateValue = worldwide.total;
    assetIds = worldwide.assetIds;
    exemption = jurisdiction.estateTax.exemptions.find(
      (e) => e.name.includes('Unified Credit') || e.name.includes('Basic Exclusion'),
    )?.amount ?? 12_920_000;
  } else if (isNRA) {
    // Only US-situs assets
    const usSitus = sumAssetsInJurisdiction(profile, 'US', 'USD', exchangeRates);
    if (usSitus.total <= 0) return liabilities;
    estateValue = usSitus.total;
    assetIds = usSitus.assetIds;
    exemption = jurisdiction.estateTax.exemptions.find(
      (e) => e.name.includes('Non-Resident'),
    )?.amount ?? 60_000;
  } else {
    return liabilities;
  }

  const result = calculateUSEstateTax(
    estateValue,
    exemption,
    isCitizenSpouse,
    jurisdiction.estateTax.brackets,
  );

  liabilities.push({
    id: nextLiabilityId(),
    jurisdiction: 'US',
    taxType: 'estate',
    grossAmount: result.tax,
    reliefAmount: 0,
    netAmount: result.tax,
    currency: 'USD',
    effectiveRate: result.effectiveRate,
    applicableAssets: assetIds,
    confidence: 'statutory',
    citations: [
      makeCitation('US', 'US Estate Tax', 'IRC section 2001', 'statutory'),
      ...(isCitizenSpouse
        ? [makeCitation('US', 'Unlimited Marital Deduction', 'IRC section 2056(a)', 'statutory')]
        : []),
    ],
    breakdown: result.breakdown,
  });

  return liabilities;
}

function calculateGBLiabilities(
  profile: UserProfile,
  determinations: ResidencyDetermination[],
  jurisdiction: Jurisdiction,
  exchangeRates: Map<string, number>,
): Liability[] {
  const liabilities: Liability[] = [];
  const primaryDet = determinations.find(
    (d) => d.personId === profile.id && d.jurisdiction === 'GB',
  );

  if (!primaryDet) return liabilities;

  const isDomiciledOrDeemed =
    primaryDet.residencyCategory === 'gb-domiciled' ||
    primaryDet.residencyCategory === 'deemed_domiciled';

  let estateValue: number;
  let assetIds: string[];

  if (isDomiciledOrDeemed) {
    // Worldwide estate for IHT
    const worldwide = sumWorldwideEstate(profile, 'GBP', exchangeRates);
    estateValue = worldwide.total;
    assetIds = worldwide.assetIds;
  } else {
    // Non-domiciled: only UK-situs assets
    const ukSitus = sumAssetsInJurisdiction(profile, 'GB', 'GBP', exchangeRates);
    if (ukSitus.total <= 0) return liabilities;
    estateValue = ukSitus.total;
    assetIds = ukSitus.assetIds;
  }

  // Determine NRB and RNRB
  const nilRateBand = jurisdiction.estateTax.exemptions.find(
    (e) => e.name.includes('Nil-Rate Band') && !e.name.includes('Residence'),
  )?.amount ?? 325_000;

  const residentialNRBExemption = jurisdiction.estateTax.exemptions.find(
    (e) => e.name.includes('Residence Nil-Rate Band'),
  );
  const residentialNRB = residentialNRBExemption?.amount ?? 175_000;

  // Check if profile owns a main residence in the UK passed to direct descendants
  const hasUKResidence = profile.assets.some(
    (a) => a.spikeLocation === 'GB' && a.assetClass === 'immovable_property',
  );
  const hasDirectDescendant = profile.family.some(
    (m) => m.relationship === 'child' && m.isBeneficiary,
  );
  const isMainResidence = hasUKResidence && hasDirectDescendant;

  // Check spousal exemption
  const spouse = profile.family.find((m) => m.relationship === 'spouse');
  const isSpouseUKDomiciled = spouse?.residency?.isDomiciled ?? false;
  if (spouse && isSpouseUKDomiciled) {
    // Unlimited spousal exemption -- no IHT on first death
    const breakdown: CalculationStep[] = [{
      description: 'Unlimited spousal exemption (both UK-domiciled)',
      amount: 0,
      currency: 'GBP',
      formula: 'IHTA 1984 section 18: full spousal exemption applies',
    }];

    liabilities.push({
      id: nextLiabilityId(),
      jurisdiction: 'GB',
      taxType: 'inheritance',
      grossAmount: 0,
      reliefAmount: 0,
      netAmount: 0,
      currency: 'GBP',
      effectiveRate: 0,
      applicableAssets: assetIds,
      confidence: 'statutory',
      citations: [
        makeCitation('GB', 'Spousal Exemption', 'IHTA 1984 section 18', 'statutory'),
      ],
      breakdown,
    });

    return liabilities;
  }

  const result = calculateUKIHT(
    estateValue,
    nilRateBand,
    isMainResidence,
    residentialNRB,
    jurisdiction.estateTax.brackets,
  );

  liabilities.push({
    id: nextLiabilityId(),
    jurisdiction: 'GB',
    taxType: 'inheritance',
    grossAmount: result.tax,
    reliefAmount: 0,
    netAmount: result.tax,
    currency: 'GBP',
    effectiveRate: result.effectiveRate,
    applicableAssets: assetIds,
    confidence: 'statutory',
    citations: [
      makeCitation('GB', 'UK Inheritance Tax', 'IHTA 1984 section 1', 'statutory'),
      ...(isDomiciledOrDeemed
        ? [makeCitation('GB', 'Deemed Domicile for IHT', 'IHTA 1984 section 267', 'statutory')]
        : []),
    ],
    breakdown: result.breakdown,
  });

  return liabilities;
}

function calculateINLiabilities(
  profile: UserProfile,
  determinations: ResidencyDetermination[],
  jurisdiction: Jurisdiction,
  exchangeRates: Map<string, number>,
): Liability[] {
  const liabilities: Liability[] = [];

  // India has NO estate tax (abolished 1985).
  // However, stamp duty applies on transfer of immovable property.
  const indianProperties = profile.assets.filter(
    (a) => a.spikeLocation === 'IN' && a.assetClass === 'immovable_property',
  );

  if (indianProperties.length === 0) return liabilities;

  // Typical stamp duty rate varies by state; we use a representative 5-7%.
  // We'll use 6% as a reasonable national average for cross-border planning.
  const stampDutyRate = 0.06;

  for (const property of indianProperties) {
    const valueINR = property.currency === 'INR'
      ? property.value * property.ownershipFraction
      : convertAmount(
          property.value * property.ownershipFraction,
          getRate(exchangeRates, property.currency, 'INR'),
        );

    const result = calculateIndiaStampDuty(valueINR, stampDutyRate);

    liabilities.push({
      id: nextLiabilityId(),
      jurisdiction: 'IN',
      taxType: 'stamp_duty',
      grossAmount: result.tax,
      reliefAmount: 0,
      netAmount: result.tax,
      currency: 'INR',
      effectiveRate: result.effectiveRate,
      applicableAssets: [property.id],
      confidence: 'interpretive',
      citations: [
        makeCitation('IN', 'India Stamp Duty on Property Transfer', 'Indian Stamp Act 1899', 'interpretive'),
        makeCitation('IN', 'Estate Duty Abolition', 'Estate Duty (Abolition) Act 1985', 'statutory'),
      ],
      breakdown: result.breakdown,
    });
  }

  return liabilities;
}

function calculatePTLiabilities(
  profile: UserProfile,
  determinations: ResidencyDetermination[],
  jurisdiction: Jurisdiction,
  exchangeRates: Map<string, number>,
): Liability[] {
  const liabilities: Liability[] = [];

  // Portugal levies Imposto do Selo (stamp duty) at 10% on gratuitous
  // transfers, but spouses/descendants/ascendants are exempt.
  const ptAssets = profile.assets.filter(
    (a) => a.spikeLocation === 'PT',
  );

  if (ptAssets.length === 0) return liabilities;

  // Check if beneficiaries are exempt relatives (spouse, children, parents)
  const hasExemptBeneficiary = profile.family.some(
    (m) =>
      m.isBeneficiary &&
      (m.relationship === 'spouse' ||
        m.relationship === 'child' ||
        m.relationship === 'parent'),
  );

  const stampDutyRate = 0.10;
  const allAssetIds = ptAssets.map((a) => a.id);

  // Sum all Portuguese-situs assets in EUR
  let totalValueEUR = 0;
  for (const asset of ptAssets) {
    const ownedValue = asset.value * asset.ownershipFraction;
    const valueEUR = asset.currency === 'EUR'
      ? ownedValue
      : convertAmount(ownedValue, getRate(exchangeRates, asset.currency, 'EUR'));
    totalValueEUR += valueEUR;
  }

  const result = calculatePortugalStampDuty(
    totalValueEUR,
    hasExemptBeneficiary,
    stampDutyRate,
  );

  liabilities.push({
    id: nextLiabilityId(),
    jurisdiction: 'PT',
    taxType: 'stamp_duty',
    grossAmount: result.tax,
    reliefAmount: 0,
    netAmount: result.tax,
    currency: 'EUR',
    effectiveRate: result.effectiveRate,
    applicableAssets: allAssetIds,
    confidence: 'statutory',
    citations: [
      makeCitation('PT', 'Imposto do Selo on Gratuitous Transfers', 'Codigo do Imposto do Selo Art 1(3)', 'statutory'),
      ...(hasExemptBeneficiary
        ? [makeCitation('PT', 'Family Exemption', 'Codigo do Imposto do Selo Art 6(e)', 'statutory')]
        : []),
    ],
    breakdown: result.breakdown,
  });

  return liabilities;
}

// -----------------------------------------------------------------------
// Main exported function
// -----------------------------------------------------------------------

/**
 * Calculate unrelieved domestic tax liabilities for each jurisdiction.
 *
 * For each jurisdiction where the person is tax-resident or has assets,
 * compute the estate/inheritance tax, stamp duty, or other applicable
 * domestic levies using that jurisdiction's rules and brackets.
 *
 * These are "gross" liabilities before treaty relief.
 */
export function calculateDomesticLiabilities(
  profile: UserProfile,
  determinations: ResidencyDetermination[],
  jurisdictions: Map<CountryCode, Jurisdiction>,
  exchangeRates: Map<string, number>,
): { liabilities: Liability[]; auditEntry: AuditEntry } {
  // Reset counter for deterministic IDs within a pipeline run
  liabilityCounter = 0;

  const liabilities: Liability[] = [];

  // US
  const usJurisdiction = jurisdictions.get('US');
  if (usJurisdiction) {
    liabilities.push(
      ...calculateUSLiabilities(profile, determinations, usJurisdiction, exchangeRates),
    );
  }

  // GB
  const gbJurisdiction = jurisdictions.get('GB');
  if (gbJurisdiction) {
    liabilities.push(
      ...calculateGBLiabilities(profile, determinations, gbJurisdiction, exchangeRates),
    );
  }

  // IN
  const inJurisdiction = jurisdictions.get('IN');
  if (inJurisdiction) {
    liabilities.push(
      ...calculateINLiabilities(profile, determinations, inJurisdiction, exchangeRates),
    );
  }

  // PT
  const ptJurisdiction = jurisdictions.get('PT');
  if (ptJurisdiction) {
    liabilities.push(
      ...calculatePTLiabilities(profile, determinations, ptJurisdiction, exchangeRates),
    );
  }

  const auditEntry: AuditEntry = {
    step: '04-domestic',
    timestamp: new Date().toISOString(),
    determination: `Calculated ${liabilities.length} domestic liability(ies) across ${jurisdictions.size} jurisdiction(s). Total gross exposure: ${liabilities.map((l) => `${l.currency} ${l.grossAmount.toLocaleString()}`).join(', ')}.`,
    inputs: {
      jurisdictions: [...jurisdictions.keys()],
      determinationCount: determinations.length,
      assetCount: profile.assets.length,
    },
    outputs: {
      liabilities: liabilities.map((l) => ({
        id: l.id,
        jurisdiction: l.jurisdiction,
        taxType: l.taxType,
        grossAmount: l.grossAmount,
        currency: l.currency,
        effectiveRate: l.effectiveRate,
      })),
    },
    citations: liabilities.flatMap((l) => l.citations),
    engineVersion: ENGINE_VERSION,
  };

  return { liabilities, auditEntry };
}
