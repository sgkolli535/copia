import type { CountryCode, Jurisdiction, TreatyEdge } from '@copia/types';
import { getJurisdiction, getTreaty } from '@copia/data-service';
import { getProfile } from '../state/session-store.js';

/**
 * get_applicable_rules tool handler.
 *
 * Retrieves the stored user profile, collects all relevant
 * jurisdictions (citizenships, residencies, asset locations),
 * loads their rules from the data service, and loads all
 * applicable treaty edges between those jurisdictions.
 */
export async function handleGetApplicableRules(_args: unknown): Promise<string> {
  const profile = getProfile();
  if (!profile) {
    throw new Error(
      'No profile stored in the current session. Call parse_user_profile first.',
    );
  }

  // Collect unique country codes from profile
  const countryCodes = new Set<CountryCode>();
  for (const c of profile.citizenships) countryCodes.add(c);
  for (const r of profile.residencies) countryCodes.add(r.country);
  for (const a of profile.assets) countryCodes.add(a.spikeLocation);

  // Load jurisdiction rules
  const jurisdictions: Array<{ jurisdiction: Jurisdiction; warnings: string[] }> = [];
  const allWarnings: string[] = [];

  for (const code of countryCodes) {
    const result = getJurisdiction(code);
    jurisdictions.push(result);
    allWarnings.push(...result.warnings);
  }

  // Load treaty edges for every pair of involved jurisdictions
  const codes = [...countryCodes];
  const treaties: Array<{ treaty: TreatyEdge; warnings: string[] }> = [];

  for (let i = 0; i < codes.length; i++) {
    for (let j = i + 1; j < codes.length; j++) {
      const a = codes[i]!;
      const b = codes[j]!;
      const result = getTreaty(a, b);
      if (result) {
        treaties.push(result);
        allWarnings.push(...result.warnings);
      }
    }
  }

  return JSON.stringify({
    profileId: profile.id,
    jurisdictions: jurisdictions.map((j) => ({
      code: j.jurisdiction.code,
      name: j.jurisdiction.name,
      hasEstateTax: j.jurisdiction.estateTax.exists,
      hasGiftTax: j.jurisdiction.giftTax.exists,
      hasCapitalGainsTax: j.jurisdiction.capitalGainsTax.exists,
      residencyRuleCount: j.jurisdiction.residencyRules.length,
      filingObligationCount: j.jurisdiction.filingObligations.length,
      sunsetProvisionCount: j.jurisdiction.sunsetProvisions.length,
    })),
    treaties: treaties.map((t) => ({
      pair: t.treaty.pair,
      treatyName: t.treaty.treatyName,
      reliefMethod: t.treaty.reliefMethod,
      taxingRightCount: t.treaty.taxingRights.length,
      gapCount: t.treaty.gaps.length,
      specialProvisionCount: t.treaty.specialProvisions.length,
    })),
    warnings: allWarnings,
    message: `Found ${jurisdictions.length} applicable jurisdictions and ${treaties.length} treaty edges for profile "${profile.name}".`,
  });
}
