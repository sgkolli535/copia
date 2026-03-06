import type {
  UserProfile,
  CountryCode,
  CurrencyCode,
  Liability,
  Conflict,
  ConfidenceTier,
  SourceCitation,
} from '@copia/types';
import type { AuditEntry } from '@copia/types';
import type { ApplicableTreaty } from './02-treaties.js';

const ENGINE_VERSION = '1.0.0';

// -----------------------------------------------------------------------
// Public interface
// -----------------------------------------------------------------------

export interface TrilateralGap {
  jurisdictions: CountryCode[];
  description: string;
  affectedAssets: string[];
  additionalExposure: number;
  currency: CurrencyCode;
}

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function makeCitation(
  jurisdiction: string,
  title: string,
  reference: string,
  confidence: ConfidenceTier,
): SourceCitation {
  return {
    id: `cit-trilateral-${jurisdiction}-${reference.replace(/[^a-zA-Z0-9]/g, '')}`,
    sourceType: 'commentary',
    title,
    reference,
    url: null,
    confidence,
    asOfDate: new Date().toISOString().slice(0, 10),
    jurisdiction,
  };
}

let conflictCounter = 0;

function nextConflictId(): string {
  conflictCounter += 1;
  return `conflict-${conflictCounter.toString().padStart(4, '0')}`;
}

// -----------------------------------------------------------------------
// Main exported function
// -----------------------------------------------------------------------

/**
 * Detect trilateral (3+ jurisdiction) gaps where bilateral treaties
 * fail to fully resolve all taxing claims.
 *
 * This step looks for:
 * 1. Assets taxed in 3+ jurisdictions with no single treaty resolving all claims
 * 2. Treaty networks with circular relief issues
 * 3. Asset classification mismatches between jurisdictions
 */
export function detectTrilateralGaps(
  adjustedLiabilities: Liability[],
  treaties: ApplicableTreaty[],
  profile: UserProfile,
): { gaps: TrilateralGap[]; conflicts: Conflict[]; auditEntry: AuditEntry } {
  conflictCounter = 0;
  const gaps: TrilateralGap[] = [];
  const conflicts: Conflict[] = [];

  // 1. Build a map: assetId -> list of jurisdictions that tax it
  const assetTaxMap = new Map<string, Set<CountryCode>>();
  const assetLiabilityMap = new Map<string, Liability[]>();

  for (const liability of adjustedLiabilities) {
    for (const assetId of liability.applicableAssets) {
      let jurisdictions = assetTaxMap.get(assetId);
      if (!jurisdictions) {
        jurisdictions = new Set();
        assetTaxMap.set(assetId, jurisdictions);
      }
      jurisdictions.add(liability.jurisdiction);

      let liabilities = assetLiabilityMap.get(assetId);
      if (!liabilities) {
        liabilities = [];
        assetLiabilityMap.set(assetId, liabilities);
      }
      liabilities.push(liability);
    }
  }

  // 2. Find assets taxed by 3+ jurisdictions
  for (const [assetId, jurisdictions] of assetTaxMap.entries()) {
    if (jurisdictions.size < 3) continue;

    const jurisdictionList = [...jurisdictions];
    const asset = profile.assets.find((a) => a.id === assetId);
    const assetName = asset?.name ?? assetId;

    // Check if all pairs are covered by treaties
    const coveredPairs = new Set<string>();
    const uncoveredPairs: [CountryCode, CountryCode][] = [];

    for (let i = 0; i < jurisdictionList.length; i++) {
      for (let j = i + 1; j < jurisdictionList.length; j++) {
        const c1 = jurisdictionList[i];
        const c2 = jurisdictionList[j];
        const pairKey = [c1, c2].sort().join('-');

        const treaty = treaties.find((t) => t.treaty.pair === pairKey);
        if (treaty && treaty.treaty.reliefMethod !== 'none') {
          coveredPairs.add(pairKey);
        } else {
          uncoveredPairs.push([c1, c2]);
        }
      }
    }

    // Calculate additional exposure from unrelieved double/triple taxation
    const assetLiabilities = assetLiabilityMap.get(assetId) ?? [];
    const totalGrossOnAsset = assetLiabilities.reduce(
      (sum, l) => sum + l.netAmount,
      0,
    );

    // The "additional exposure" is the net tax remaining after treaty relief
    // from the secondary jurisdictions. If the asset is still taxed in 3+ places
    // even after bilateral relief, there's a gap.
    const netByJurisdiction = new Map<CountryCode, number>();
    for (const l of assetLiabilities) {
      const current = netByJurisdiction.get(l.jurisdiction) ?? 0;
      netByJurisdiction.set(l.jurisdiction, current + l.netAmount);
    }

    // The "fair" single-jurisdiction tax is the highest single-jurisdiction liability
    const maxSingleJurisdiction = Math.max(
      ...[...netByJurisdiction.values()],
    );
    const additionalExposure = Math.max(
      0,
      totalGrossOnAsset - maxSingleJurisdiction,
    );

    if (additionalExposure > 0 || uncoveredPairs.length > 0) {
      gaps.push({
        jurisdictions: jurisdictionList,
        description:
          `Asset "${assetName}" is taxed in ${jurisdictionList.length} jurisdictions (${jurisdictionList.join(', ')}). ` +
          (uncoveredPairs.length > 0
            ? `No estate tax treaty covers the pair(s): ${uncoveredPairs.map(([a, b]) => `${a}-${b}`).join(', ')}. `
            : 'All pairs have treaties, but bilateral relief does not fully eliminate triple taxation. ') +
          `Estimated additional exposure: ${asset?.currency ?? 'USD'} ${additionalExposure.toLocaleString()}.`,
        affectedAssets: [assetId],
        additionalExposure,
        currency: asset?.currency ?? 'USD',
      });

      // Create a formal Conflict entry
      const assetClasses = asset
        ? [asset.assetClass]
        : ['other' as const];

      conflicts.push({
        id: nextConflictId(),
        jurisdictions: jurisdictionList,
        description:
          `Trilateral taxation of "${assetName}": ${jurisdictionList.join(', ')} all assert taxing rights. ` +
          `Bilateral treaties resolve ${coveredPairs.size} of ${coveredPairs.size + uncoveredPairs.length} pairs.`,
        affectedAssets: assetClasses,
        exposureAmount: additionalExposure,
        currency: asset?.currency ?? 'USD',
        resolution:
          uncoveredPairs.length > 0
            ? `No treaty relief available for ${uncoveredPairs.map(([a, b]) => `${a}-${b}`).join(', ')}. Consider unilateral foreign tax credit claims or restructuring asset ownership.`
            : 'Bilateral treaties provide partial relief. Consider consolidating assets or obtaining professional advice on credit stacking.',
        treaty: null,
        confidence: 'advisory',
        citations: [
          makeCitation(
            jurisdictionList.join(', '),
            'Trilateral Taxation Gap',
            `Assets in ${jurisdictionList.join('/')}`,
            'advisory',
          ),
        ],
      });
    }
  }

  // 3. Check for circular relief issues in the treaty network
  //    Example: A credits B's tax, B credits C's tax, C credits A's tax
  //    This can happen when 3 jurisdictions all assert primary taxing rights
  //    on the same asset.
  const treatyPairsWithRelief = treaties.filter(
    (t) => t.treaty.reliefMethod === 'credit',
  );

  if (treatyPairsWithRelief.length >= 3) {
    // Check if any 3 treaties form a cycle
    const allCountries = new Set<CountryCode>();
    for (const t of treatyPairsWithRelief) {
      allCountries.add(t.treaty.countries[0]);
      allCountries.add(t.treaty.countries[1]);
    }

    const countryList = [...allCountries];
    if (countryList.length >= 3) {
      // For each triplet of countries, check if all 3 pairs have credit-method treaties
      for (let i = 0; i < countryList.length; i++) {
        for (let j = i + 1; j < countryList.length; j++) {
          for (let k = j + 1; k < countryList.length; k++) {
            const triplet = [countryList[i], countryList[j], countryList[k]];
            const pairKeys = [
              [triplet[0], triplet[1]].sort().join('-'),
              [triplet[0], triplet[2]].sort().join('-'),
              [triplet[1], triplet[2]].sort().join('-'),
            ];

            const allHaveCredit = pairKeys.every((pk) =>
              treatyPairsWithRelief.some((t) => t.treaty.pair === pk),
            );

            if (allHaveCredit) {
              // Check if any assets are present in all 3 jurisdictions
              const assetsInAll = profile.assets.filter((a) =>
                triplet.includes(a.spikeLocation),
              );

              if (assetsInAll.length > 0) {
                // Circular credit risk exists but may not cause actual
                // double taxation if the credits are properly stacked.
                // Flag as advisory.
                const existingGap = gaps.find(
                  (g) =>
                    g.jurisdictions.length === 3 &&
                    triplet.every((c) => g.jurisdictions.includes(c)),
                );
                if (!existingGap) {
                  gaps.push({
                    jurisdictions: triplet,
                    description:
                      `Circular credit risk: all three pairs ${pairKeys.join(', ')} use the credit method. ` +
                      `When assets are taxed in all three jurisdictions, credit stacking may not fully eliminate double taxation.`,
                    affectedAssets: assetsInAll.map((a) => a.id),
                    additionalExposure: 0, // Hard to quantify without detailed credit calculations
                    currency: profile.reportingCurrency,
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  // 4. Check for asset classification mismatches
  //    Some assets may be classified differently in different jurisdictions
  //    (e.g. a REIT might be "immovable property" in one and "shares" in another)
  for (const asset of profile.assets) {
    const assetJurisdictions = assetTaxMap.get(asset.id);
    if (!assetJurisdictions || assetJurisdictions.size < 2) continue;

    // Check if any treaty explicitly notes a classification issue
    for (const treaty of treaties) {
      const [tc1, tc2] = treaty.treaty.countries;
      if (!assetJurisdictions.has(tc1) || !assetJurisdictions.has(tc2)) continue;

      for (const gap of treaty.treaty.gaps) {
        if (gap.affectedAssetClasses.includes(asset.assetClass)) {
          const existingConflict = conflicts.find(
            (c) =>
              c.description.includes(asset.name) &&
              c.description.includes('classification'),
          );
          if (!existingConflict) {
            conflicts.push({
              id: nextConflictId(),
              jurisdictions: [tc1, tc2],
              description:
                `Asset classification concern for "${asset.name}" (${asset.assetClass}): ${gap.description}`,
              affectedAssets: [asset.assetClass],
              exposureAmount: 0,
              currency: asset.currency,
              resolution: gap.mitigation,
              treaty: treaty.treaty.pair,
              confidence: 'advisory',
              citations: [
                makeCitation(
                  treaty.treaty.pair,
                  `Treaty gap: ${gap.description.substring(0, 60)}`,
                  treaty.treaty.source,
                  'advisory',
                ),
              ],
            });
          }
        }
      }
    }
  }

  const auditEntry: AuditEntry = {
    step: '06-trilateral',
    timestamp: new Date().toISOString(),
    determination: `Detected ${gaps.length} trilateral gap(s) and ${conflicts.length} conflict(s) across ${assetTaxMap.size} asset(s).`,
    inputs: {
      liabilityCount: adjustedLiabilities.length,
      treatyCount: treaties.length,
      assetCount: profile.assets.length,
    },
    outputs: {
      gaps: gaps.map((g) => ({
        jurisdictions: g.jurisdictions,
        additionalExposure: g.additionalExposure,
        currency: g.currency,
      })),
      conflicts: conflicts.map((c) => ({
        id: c.id,
        jurisdictions: c.jurisdictions,
        description: c.description.substring(0, 100),
      })),
    },
    citations: conflicts.flatMap((c) => c.citations),
    engineVersion: ENGINE_VERSION,
  };

  return { gaps, conflicts, auditEntry };
}
