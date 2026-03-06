import type { TaxBracket, CurrencyCode } from '@copia/types';
import type { CalculationStep } from '@copia/types';

/**
 * Apply progressive tax brackets to a taxable amount.
 *
 * Walks through sorted brackets, applying each marginal rate to the
 * portion of `amount` that falls within [bracket.from, bracket.to).
 */
export function applyBrackets(
  amount: number,
  brackets: TaxBracket[],
): { tax: number; effectiveRate: number; breakdown: CalculationStep[] } {
  const breakdown: CalculationStep[] = [];
  let tax = 0;

  // Brackets are assumed sorted by `from` ascending
  const sorted = [...brackets].sort((a, b) => a.from - b.from);

  for (const bracket of sorted) {
    if (amount <= bracket.from) break;

    const upper = bracket.to === null ? amount : Math.min(bracket.to, amount);
    const taxableInBracket = upper - bracket.from;

    if (taxableInBracket <= 0) continue;

    const bracketTax = taxableInBracket * bracket.rate;
    tax += bracketTax;

    const currency = 'USD' as CurrencyCode; // placeholder; overridden by caller context
    breakdown.push({
      description: `Bracket ${bracket.from.toLocaleString()}-${bracket.to === null ? '...' : bracket.to.toLocaleString()} at ${(bracket.rate * 100).toFixed(1)}%`,
      amount: bracketTax,
      currency,
      formula: `${taxableInBracket.toLocaleString()} x ${(bracket.rate * 100).toFixed(1)}% = ${bracketTax.toLocaleString()}`,
    });
  }

  const effectiveRate = amount > 0 ? tax / amount : 0;

  return { tax, effectiveRate, breakdown };
}

/**
 * Calculate US federal estate tax.
 *
 * The US estate tax applies graduated brackets to the entire taxable estate,
 * then subtracts the unified credit (which effectively shelters the exemption amount).
 * For citizen spouses, the unlimited marital deduction applies.
 */
export function calculateUSEstateTax(
  totalEstate: number,
  exemption: number,
  isCitizenSpouse: boolean,
  brackets: TaxBracket[],
): { tax: number; effectiveRate: number; breakdown: CalculationStep[] } {
  const breakdown: CalculationStep[] = [];

  breakdown.push({
    description: 'Gross estate value',
    amount: totalEstate,
    currency: 'USD',
    formula: `Gross estate = ${totalEstate.toLocaleString()}`,
  });

  // Unlimited marital deduction for US citizen spouse
  if (isCitizenSpouse) {
    breakdown.push({
      description: 'Unlimited marital deduction (US citizen spouse)',
      amount: 0,
      currency: 'USD',
      formula: 'IRC section 2056(a): entire estate passes tax-free to citizen spouse',
    });
    return { tax: 0, effectiveRate: 0, breakdown };
  }

  // Compute tentative tax on the full estate using brackets
  const tentativeResult = applyBrackets(totalEstate, brackets);

  // Compute the unified credit (tax on the exemption amount)
  const creditResult = applyBrackets(exemption, brackets);
  const unifiedCredit = creditResult.tax;

  breakdown.push({
    description: 'Tentative tax on gross estate',
    amount: tentativeResult.tax,
    currency: 'USD',
    formula: `Tentative tax = ${tentativeResult.tax.toLocaleString()}`,
  });

  breakdown.push({
    description: `Unified credit (shelters first ${exemption.toLocaleString()})`,
    amount: -unifiedCredit,
    currency: 'USD',
    formula: `Unified credit = -${unifiedCredit.toLocaleString()} (tax on ${exemption.toLocaleString()} exemption)`,
  });

  // Merge bracket-level breakdown
  breakdown.push(...tentativeResult.breakdown.map((s) => ({
    ...s,
    currency: 'USD' as CurrencyCode,
  })));

  const tax = Math.max(0, tentativeResult.tax - unifiedCredit);

  breakdown.push({
    description: 'Net US estate tax',
    amount: tax,
    currency: 'USD',
    formula: `Net tax = max(0, ${tentativeResult.tax.toLocaleString()} - ${unifiedCredit.toLocaleString()}) = ${tax.toLocaleString()}`,
  });

  const effectiveRate = totalEstate > 0 ? tax / totalEstate : 0;

  return { tax, effectiveRate, breakdown };
}

/**
 * Calculate UK Inheritance Tax.
 *
 * UK IHT uses a nil-rate band (NRB) and an optional residential nil-rate band
 * (RNRB). Everything above the combined threshold is taxed at 40%.
 */
export function calculateUKIHT(
  estateValue: number,
  nilRateBand: number,
  isMainResidence: boolean,
  residentialNRB: number,
  brackets: TaxBracket[],
): { tax: number; effectiveRate: number; breakdown: CalculationStep[] } {
  const breakdown: CalculationStep[] = [];

  breakdown.push({
    description: 'Estate value for UK IHT',
    amount: estateValue,
    currency: 'GBP',
    formula: `Estate = ${estateValue.toLocaleString()}`,
  });

  // Calculate total threshold
  let totalThreshold = nilRateBand;
  breakdown.push({
    description: 'Nil-rate band (NRB)',
    amount: nilRateBand,
    currency: 'GBP',
    formula: `NRB = ${nilRateBand.toLocaleString()}`,
  });

  if (isMainResidence) {
    // RNRB tapers by GBP 1 for every GBP 2 the estate exceeds GBP 2,000,000
    let effectiveRNRB = residentialNRB;
    if (estateValue > 2_000_000) {
      const taper = Math.floor((estateValue - 2_000_000) / 2);
      effectiveRNRB = Math.max(0, residentialNRB - taper);
    }
    totalThreshold += effectiveRNRB;

    breakdown.push({
      description: 'Residence nil-rate band (RNRB)',
      amount: effectiveRNRB,
      currency: 'GBP',
      formula: effectiveRNRB < residentialNRB
        ? `RNRB = ${residentialNRB.toLocaleString()} tapered to ${effectiveRNRB.toLocaleString()} (estate exceeds GBP 2M)`
        : `RNRB = ${effectiveRNRB.toLocaleString()}`,
    });
  }

  breakdown.push({
    description: 'Total threshold',
    amount: totalThreshold,
    currency: 'GBP',
    formula: `Threshold = ${totalThreshold.toLocaleString()}`,
  });

  const taxableAmount = Math.max(0, estateValue - totalThreshold);

  if (taxableAmount <= 0) {
    breakdown.push({
      description: 'Estate within nil-rate band; no IHT due',
      amount: 0,
      currency: 'GBP',
      formula: `${estateValue.toLocaleString()} <= ${totalThreshold.toLocaleString()} => tax = 0`,
    });
    return { tax: 0, effectiveRate: 0, breakdown };
  }

  // Apply the IHT rate to the excess. Use the provided brackets.
  // UK brackets encode the nil-rate band as a 0% bracket, so we apply
  // brackets directly to the full estate value for correct marginal math.
  const bracketResult = applyBrackets(estateValue, brackets);

  // Adjust breakdown descriptions to GBP
  const adjustedBreakdown = bracketResult.breakdown.map((s) => ({
    ...s,
    currency: 'GBP' as CurrencyCode,
  }));
  breakdown.push(...adjustedBreakdown);

  // When using RNRB, the effective tax may be lower than what pure brackets give.
  // The brackets already have a 0% band up to 325k (the standard NRB), but if
  // RNRB applies we need to account for the additional zero-rated amount.
  let tax: number;
  if (isMainResidence && residentialNRB > 0) {
    // Recalculate: tax is 40% of amount above total threshold
    const ihtRate = 0.40;
    tax = taxableAmount * ihtRate;
    breakdown.push({
      description: 'IHT on amount above combined NRB + RNRB',
      amount: tax,
      currency: 'GBP',
      formula: `${taxableAmount.toLocaleString()} x 40% = ${tax.toLocaleString()}`,
    });
  } else {
    tax = bracketResult.tax;
  }

  const effectiveRate = estateValue > 0 ? tax / estateValue : 0;

  breakdown.push({
    description: 'Net UK IHT',
    amount: tax,
    currency: 'GBP',
    formula: `Effective rate = ${(effectiveRate * 100).toFixed(2)}%`,
  });

  return { tax, effectiveRate, breakdown };
}

/**
 * Calculate India stamp duty on property transfers.
 *
 * India abolished estate duty in 1985. However, stamp duty is levied
 * on transfers of immovable property.
 */
export function calculateIndiaStampDuty(
  propertyValue: number,
  stampDutyRate: number,
): { tax: number; effectiveRate: number; breakdown: CalculationStep[] } {
  const breakdown: CalculationStep[] = [];
  const tax = propertyValue * stampDutyRate;

  breakdown.push({
    description: 'Property value for stamp duty',
    amount: propertyValue,
    currency: 'INR',
    formula: `Property value = ${propertyValue.toLocaleString()}`,
  });

  breakdown.push({
    description: `Stamp duty at ${(stampDutyRate * 100).toFixed(1)}%`,
    amount: tax,
    currency: 'INR',
    formula: `${propertyValue.toLocaleString()} x ${(stampDutyRate * 100).toFixed(1)}% = ${tax.toLocaleString()}`,
  });

  return { tax, effectiveRate: stampDutyRate, breakdown };
}

/**
 * Calculate Portugal stamp duty (Imposto do Selo) on gratuitous transfers.
 *
 * Spouses, descendants, and ascendants are exempt. All others pay 10%.
 */
export function calculatePortugalStampDuty(
  transferValue: number,
  isExemptRelative: boolean,
  stampDutyRate: number,
): { tax: number; effectiveRate: number; breakdown: CalculationStep[] } {
  const breakdown: CalculationStep[] = [];

  breakdown.push({
    description: 'Transfer value for Imposto do Selo',
    amount: transferValue,
    currency: 'EUR',
    formula: `Transfer value = ${transferValue.toLocaleString()}`,
  });

  if (isExemptRelative) {
    breakdown.push({
      description: 'Exempt transfer to spouse/descendant/ascendant',
      amount: 0,
      currency: 'EUR',
      formula: 'Codigo do Imposto do Selo Art 6(e): exempt relatives pay 0%',
    });
    return { tax: 0, effectiveRate: 0, breakdown };
  }

  const tax = transferValue * stampDutyRate;

  breakdown.push({
    description: `Stamp duty at ${(stampDutyRate * 100).toFixed(1)}%`,
    amount: tax,
    currency: 'EUR',
    formula: `${transferValue.toLocaleString()} x ${(stampDutyRate * 100).toFixed(1)}% = ${tax.toLocaleString()}`,
  });

  return { tax, effectiveRate: stampDutyRate, breakdown };
}

/**
 * Convert an amount using a given exchange rate.
 */
export function convertAmount(amount: number, rate: number): number {
  return amount * rate;
}
