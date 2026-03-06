import { getJurisdiction } from '@copia/data-service';
import { GetJurisdictionInfoInput } from '../schemas/index.js';

/**
 * get_jurisdiction_info tool handler.
 *
 * Validates the country code and returns the full jurisdiction
 * rules from the data service, including estate tax, gift tax,
 * capital gains tax, residency rules, filing obligations,
 * and sunset provisions.
 */
export async function handleGetJurisdictionInfo(args: unknown): Promise<string> {
  const input = GetJurisdictionInfoInput.parse(args);

  const { jurisdiction, warnings } = getJurisdiction(input.countryCode);

  return JSON.stringify({
    code: jurisdiction.code,
    name: jurisdiction.name,
    currency: jurisdiction.currency,
    estateTax: {
      exists: jurisdiction.estateTax.exists,
      taxBase: jurisdiction.estateTax.taxBase,
      bracketCount: jurisdiction.estateTax.brackets.length,
      brackets: jurisdiction.estateTax.brackets,
      exemptions: jurisdiction.estateTax.exemptions,
      spousalProvisions: jurisdiction.estateTax.spousalProvisions,
      specialRules: jurisdiction.estateTax.specialRules,
      currency: jurisdiction.estateTax.currency,
    },
    giftTax: {
      exists: jurisdiction.giftTax.exists,
      annualExclusion: jurisdiction.giftTax.annualExclusion,
      lifetimeExemption: jurisdiction.giftTax.lifetimeExemption,
      spousalExclusion: jurisdiction.giftTax.spousalExclusion,
      nonCitizenSpousalExclusion: jurisdiction.giftTax.nonCitizenSpousalExclusion,
      brackets: jurisdiction.giftTax.brackets,
      specialRules: jurisdiction.giftTax.specialRules,
      currency: jurisdiction.giftTax.currency,
    },
    capitalGainsTax: {
      exists: jurisdiction.capitalGainsTax.exists,
      holdingPeriodMonths: jurisdiction.capitalGainsTax.holdingPeriodMonths,
      shortTermBrackets: jurisdiction.capitalGainsTax.shortTermBrackets,
      longTermBrackets: jurisdiction.capitalGainsTax.longTermBrackets,
      exemptions: jurisdiction.capitalGainsTax.exemptions,
      currency: jurisdiction.capitalGainsTax.currency,
    },
    residencyRules: jurisdiction.residencyRules,
    filingObligations: jurisdiction.filingObligations,
    sunsetProvisions: jurisdiction.sunsetProvisions,
    lastUpdated: jurisdiction.lastUpdated,
    source: jurisdiction.source,
    warnings,
  });
}
