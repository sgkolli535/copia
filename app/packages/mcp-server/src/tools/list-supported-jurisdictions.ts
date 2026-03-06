import { listJurisdictions, getJurisdiction, listTreaties } from '@copia/data-service';
import type { CountryCode } from '@copia/types';

/**
 * list_supported_jurisdictions tool handler.
 *
 * Returns all supported jurisdiction codes with summary
 * metadata about their tax coverage and available treaties.
 */
export async function handleListSupportedJurisdictions(_args: unknown): Promise<string> {
  const codes = listJurisdictions();
  const treaties = listTreaties();

  const jurisdictions = codes.map((code: CountryCode) => {
    const { jurisdiction } = getJurisdiction(code);

    // Count treaties that involve this jurisdiction
    const treatyCount = treaties.filter(
      (t) => t.countries.includes(code),
    ).length;

    return {
      code: jurisdiction.code,
      name: jurisdiction.name,
      currency: jurisdiction.currency,
      hasEstateTax: jurisdiction.estateTax.exists,
      hasGiftTax: jurisdiction.giftTax.exists,
      hasCapitalGainsTax: jurisdiction.capitalGainsTax.exists,
      residencyRuleCount: jurisdiction.residencyRules.length,
      filingObligationCount: jurisdiction.filingObligations.length,
      sunsetProvisionCount: jurisdiction.sunsetProvisions.length,
      treatyCount,
      lastUpdated: jurisdiction.lastUpdated,
      source: jurisdiction.source,
    };
  });

  return JSON.stringify({
    jurisdictions,
    totalCount: jurisdictions.length,
    treatyEdgeCount: treaties.length,
    message: `${jurisdictions.length} jurisdictions supported with ${treaties.length} treaty edges.`,
  });
}
