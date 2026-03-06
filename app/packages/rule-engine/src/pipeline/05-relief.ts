import type {
  Liability,
  TreatyApplication,
  ReliefDetail,
  CurrencyCode,
  CountryCode,
  SourceCitation,
} from '@copia/types';
import type { AuditEntry } from '@copia/types';
import type { ResidencyDetermination } from './01-residency.js';
import type { ApplicableTreaty } from './02-treaties.js';
import type { TieBreakerResult } from './03-tie-breaker.js';

const ENGINE_VERSION = '1.0.0';

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

/**
 * Determine the "residence country" and "source country" for a pair
 * of jurisdictions given tie-breaker results and residency determinations.
 */
function classifyResidenceAndSource(
  c1: CountryCode,
  c2: CountryCode,
  personId: string,
  determinations: ResidencyDetermination[],
  tieBreakerResults: TieBreakerResult[],
): { residenceCountry: CountryCode; sourceCountry: CountryCode } | null {
  // Check tie-breaker resolution
  const tieBreaker = tieBreakerResults.find(
    (tb) =>
      tb.personId === personId &&
      tb.jurisdictions.includes(c1) &&
      tb.jurisdictions.includes(c2),
  );

  if (tieBreaker?.resolvedResidence) {
    const residenceCountry = tieBreaker.resolvedResidence;
    const sourceCountry = residenceCountry === c1 ? c2 : c1;
    return { residenceCountry, sourceCountry };
  }

  // Fall back to residency determinations: the "more resident" one is residence
  const c1Det = determinations.find(
    (d) => d.personId === personId && d.jurisdiction === c1,
  );
  const c2Det = determinations.find(
    (d) => d.personId === personId && d.jurisdiction === c2,
  );

  if (c1Det?.isResident && !c2Det?.isResident) {
    return { residenceCountry: c1, sourceCountry: c2 };
  }
  if (c2Det?.isResident && !c1Det?.isResident) {
    return { residenceCountry: c2, sourceCountry: c1 };
  }

  // Both resident or both non-resident: use the first as residence by convention
  if (c1Det && c2Det) {
    return { residenceCountry: c1, sourceCountry: c2 };
  }

  return null;
}

/**
 * Find the liability for a given jurisdiction from the liabilities list.
 */
function findLiabilitiesForJurisdiction(
  liabilities: Liability[],
  code: CountryCode,
): Liability[] {
  return liabilities.filter((l) => l.jurisdiction === code);
}

// -----------------------------------------------------------------------
// Main exported function
// -----------------------------------------------------------------------

/**
 * Apply treaty relief to the domestic liabilities calculated in step 04.
 *
 * For each applicable treaty, determine the relief method (credit or
 * exemption) and adjust the residence-country liability accordingly.
 *
 * Credit method:  residence-country tax reduced by the lesser of
 *                 (a) source-country tax paid, or
 *                 (b) residence-country tax attributable to the
 *                     source-country income/assets.
 *
 * Exemption method: source-country assets/income excluded from the
 *                   residence-country tax base.
 *
 * US Saving Clause: The US always taxes its citizens. If a US citizen
 * is the residence-country person, the US tax stays, but a credit for
 * foreign tax (e.g. UK IHT) is applied.
 */
export function applyTreatyRelief(
  liabilities: Liability[],
  treaties: ApplicableTreaty[],
  determinations: ResidencyDetermination[],
  tieBreakerResults: TieBreakerResult[],
): {
  adjustedLiabilities: Liability[];
  treatyApplications: TreatyApplication[];
  auditEntry: AuditEntry;
} {
  // Deep-copy liabilities so we can mutate without side effects
  const adjustedLiabilities: Liability[] = liabilities.map((l) => ({ ...l }));
  const treatyApplications: TreatyApplication[] = [];

  for (const applicableTreaty of treaties) {
    const treaty = applicableTreaty.treaty;
    const [c1, c2] = treaty.countries;

    // Only process treaties that cover estate/inheritance taxes
    // (check if relief method is not 'none' OR if there's a saving clause)
    const hasSavingClause = treaty.specialProvisions.some(
      (sp) => sp.id === 'us-saving-clause',
    );

    for (const personId of applicableTreaty.affectedPersons) {
      const classification = classifyResidenceAndSource(
        c1, c2, personId, determinations, tieBreakerResults,
      );
      if (!classification) continue;

      const { residenceCountry, sourceCountry } = classification;

      const residenceLiabilities = findLiabilitiesForJurisdiction(
        adjustedLiabilities,
        residenceCountry,
      );
      const sourceLiabilities = findLiabilitiesForJurisdiction(
        adjustedLiabilities,
        sourceCountry,
      );

      if (residenceLiabilities.length === 0 && sourceLiabilities.length === 0) continue;

      const reliefDetails: ReliefDetail[] = [];
      let totalRelief = 0;

      if (treaty.reliefMethod === 'credit' || hasSavingClause) {
        // Credit method: reduce residence-country liability by tax paid in source country.
        //
        // For the US saving clause with a US citizen:
        //   - The US is ALWAYS the residence country for its citizens
        //   - Credit the foreign tax paid (e.g. UK IHT) against US estate tax

        // Determine if the US saving clause re-designates the US as residence
        let effectiveResidence = residenceCountry;
        let effectiveSource = sourceCountry;

        if (hasSavingClause) {
          const personCitizenships = determinations
            .filter((d) => d.personId === personId)
            .flatMap((d) =>
              d.residencyCategory === 'us-citizen' ? ['US' as CountryCode] : [],
            );
          if (personCitizenships.includes('US') && residenceCountry !== 'US') {
            // Swap: US is always residence for its citizens under the saving clause
            effectiveResidence = 'US';
            effectiveSource = residenceCountry === 'US' ? sourceCountry : residenceCountry;
          }
        }

        const effectiveResLiabilities = findLiabilitiesForJurisdiction(
          adjustedLiabilities,
          effectiveResidence,
        );
        const effectiveSourceLiabilities = findLiabilitiesForJurisdiction(
          adjustedLiabilities,
          effectiveSource,
        );

        // Total source-country tax paid
        const sourceTaxPaid = effectiveSourceLiabilities.reduce(
          (sum, l) => sum + l.grossAmount,
          0,
        );

        if (sourceTaxPaid <= 0) continue;

        // Apply credit to each residence-country liability
        for (const resLiability of effectiveResLiabilities) {
          if (resLiability.grossAmount <= 0) continue;

          // Find overlapping assets
          const overlappingAssets = resLiability.applicableAssets.filter(
            (aid) =>
              effectiveSourceLiabilities.some((sl) =>
                sl.applicableAssets.includes(aid),
              ),
          );

          if (overlappingAssets.length === 0) {
            // If liabilities are on the worldwide estate, all assets overlap
            // (e.g. US citizen's worldwide estate tax vs UK IHT on UK property)
            // In this case, credit the source tax up to the residence tax
          }

          // Credit is the lesser of source tax paid and residence tax on those assets
          const credit = Math.min(sourceTaxPaid, resLiability.grossAmount);

          resLiability.reliefAmount += credit;
          resLiability.netAmount = resLiability.grossAmount - resLiability.reliefAmount;
          totalRelief += credit;

          for (const taxingRight of treaty.taxingRights) {
            const affectedSourceLiabilities = effectiveSourceLiabilities.filter(
              (sl) => sl.grossAmount > 0,
            );
            if (affectedSourceLiabilities.length > 0) {
              reliefDetails.push({
                assetClass: taxingRight.assetClass,
                assetIds: overlappingAssets.length > 0 ? overlappingAssets : resLiability.applicableAssets,
                grossLiability: resLiability.grossAmount,
                reliefApplied: credit,
                netLiability: resLiability.netAmount,
                method: 'credit',
                articleRef: taxingRight.articleRef,
              });
              break; // One relief detail per liability
            }
          }
        }
      } else if (treaty.reliefMethod === 'exemption' || treaty.reliefMethod === 'exemption_with_progression') {
        // Exemption method: exclude source-country assets from residence-country tax base
        // This is less common for estate taxes but appears in some treaties

        for (const resLiability of residenceLiabilities) {
          // Find assets that are in the source country
          const sourceAssetIds = resLiability.applicableAssets.filter(
            (aid) =>
              sourceLiabilities.some((sl) =>
                sl.applicableAssets.includes(aid),
              ),
          );

          if (sourceAssetIds.length === 0) continue;

          // The exemption reduces the residence-country liability proportionally
          const sourceAssetLiability = sourceLiabilities.reduce(
            (sum, sl) => sum + sl.grossAmount,
            0,
          );
          const exemptionAmount = Math.min(sourceAssetLiability, resLiability.grossAmount);

          resLiability.reliefAmount += exemptionAmount;
          resLiability.netAmount = resLiability.grossAmount - resLiability.reliefAmount;
          totalRelief += exemptionAmount;

          reliefDetails.push({
            assetClass: 'other',
            assetIds: sourceAssetIds,
            grossLiability: resLiability.grossAmount,
            reliefApplied: exemptionAmount,
            netLiability: resLiability.netAmount,
            method: treaty.reliefMethod,
            articleRef: treaty.taxingRights[0]?.articleRef ?? 'N/A',
          });
        }
      }
      // 'none' relief method -- no action

      if (reliefDetails.length > 0) {
        // Determine the currency for the treaty application
        const primaryCurrency: CurrencyCode =
          residenceLiabilities[0]?.currency ?? 'USD';

        treatyApplications.push({
          treaty: treaty.pair,
          reliefMethod: treaty.reliefMethod === 'none' && hasSavingClause ? 'credit' : treaty.reliefMethod,
          reliefDetails,
          totalRelief,
          currency: primaryCurrency,
        });
      }
    }
  }

  const auditEntry: AuditEntry = {
    step: '05-relief',
    timestamp: new Date().toISOString(),
    determination: `Applied treaty relief from ${treatyApplications.length} treaty application(s). Total relief: ${treatyApplications.reduce((sum, ta) => sum + ta.totalRelief, 0).toLocaleString()}.`,
    inputs: {
      treatyCount: treaties.length,
      liabilityCount: liabilities.length,
    },
    outputs: {
      treatyApplications: treatyApplications.map((ta) => ({
        treaty: ta.treaty,
        method: ta.reliefMethod,
        totalRelief: ta.totalRelief,
        currency: ta.currency,
      })),
      adjustedLiabilities: adjustedLiabilities.map((l) => ({
        id: l.id,
        jurisdiction: l.jurisdiction,
        grossAmount: l.grossAmount,
        reliefAmount: l.reliefAmount,
        netAmount: l.netAmount,
        currency: l.currency,
      })),
    },
    citations: treatyApplications.flatMap((ta) =>
      ta.reliefDetails.map(
        (rd): SourceCitation => ({
          id: `cit-relief-${ta.treaty}-${rd.assetClass}`,
          sourceType: 'treaty',
          title: `Treaty relief: ${ta.reliefMethod} method under ${ta.treaty}`,
          reference: rd.articleRef,
          url: null,
          confidence: 'statutory',
          asOfDate: new Date().toISOString().slice(0, 10),
          jurisdiction: ta.treaty,
        }),
      ),
    ),
    engineVersion: ENGINE_VERSION,
  };

  return { adjustedLiabilities, treatyApplications, auditEntry };
}
