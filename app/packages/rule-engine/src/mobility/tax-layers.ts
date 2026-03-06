import type {
  MoneyEvent,
  UserProfile,
  Jurisdiction,
  TreatyEdge,
  TaxLayer,
  TaxLayerResult,
  CurrencyCode,
  SourceCitation,
} from '@copia/types';
import { applyBrackets, convertAmount } from '../calculators/tax.js';
import { convert, buildExchangeRateMap } from '../calculators/currency.js';
import type { ExchangeRateSnapshot } from '@copia/types';

/**
 * Compute the 5-layer cost stack for a money event:
 * 1. Source tax — withholding/TDS/CGT in origin country
 * 2. Destination tax — income/estate tax in receiving country
 * 3. Treaty relief — reduction via DTAA
 * 4. Transfer costs — banking fees, currency conversion (flagged as estimate)
 * 5. Timing — acceleration/deferral considerations
 */
export function computeTaxLayers(
  event: MoneyEvent,
  profile: UserProfile,
  sourceJurisdiction: Jurisdiction,
  destJurisdiction: Jurisdiction,
  treaties: TreatyEdge[],
  exchangeRates: ExchangeRateSnapshot[],
): TaxLayerResult {
  const rateMap = buildExchangeRateMap(exchangeRates);
  const amount = event.amount;
  const reportingCurrency = profile.reportingCurrency;

  const layers: TaxLayer[] = [];

  // Layer 1: Source tax
  const sourceTax = computeSourceTax(event, sourceJurisdiction);
  layers.push(sourceTax);

  // Layer 2: Destination tax
  const destTax = computeDestinationTax(event, destJurisdiction);
  layers.push(destTax);

  // Layer 3: Treaty relief
  const treaty = findApplicableTreaty(
    event.sourceCountry,
    event.destinationCountry,
    treaties,
  );
  const treatyRelief = computeTreatyRelief(sourceTax, destTax, treaty);
  layers.push(treatyRelief);

  // Layer 4: Transfer costs (flagged as estimate)
  const transferCosts = estimateTransferCosts(amount, event.currency);
  layers.push(transferCosts);

  // Layer 5: Timing considerations
  const timingLayer = assessTiming(event, sourceJurisdiction);
  layers.push(timingLayer);

  // Calculate totals
  const totalCost =
    sourceTax.amount + destTax.amount - Math.abs(treatyRelief.amount) + transferCosts.amount + timingLayer.amount;
  const netAmount = amount - totalCost;
  const effectiveRate = amount > 0 ? totalCost / amount : 0;

  return {
    layers,
    totalCost: Math.max(0, totalCost),
    effectiveRate,
    netAmount: Math.max(0, netAmount),
    currency: event.currency,
  };
}

function computeSourceTax(
  event: MoneyEvent,
  sourceJurisdiction: Jurisdiction,
): TaxLayer {
  const amount = event.amount;
  let taxAmount = 0;
  let rate = 0;
  let description = '';

  switch (event.type) {
    case 'inheritance': {
      if (!sourceJurisdiction.estateTax.exists) {
        description = `No estate/inheritance tax in ${sourceJurisdiction.name}`;
      } else {
        const result = applyBrackets(amount, sourceJurisdiction.estateTax.brackets);
        taxAmount = result.tax;
        rate = result.effectiveRate;
        description = `${sourceJurisdiction.name} estate/inheritance tax at ${(rate * 100).toFixed(1)}% effective rate`;
      }
      break;
    }
    case 'property_sale': {
      // Use long-term capital gains as default for property
      if (sourceJurisdiction.capitalGainsTax.exists) {
        const result = applyBrackets(amount, sourceJurisdiction.capitalGainsTax.longTermBrackets);
        taxAmount = result.tax;
        rate = result.effectiveRate;
        description = `${sourceJurisdiction.name} LTCG at ${(rate * 100).toFixed(1)}% effective rate`;
      }
      break;
    }
    case 'business_exit':
    case 'investment_liquidation': {
      if (sourceJurisdiction.capitalGainsTax.exists) {
        const result = applyBrackets(amount, sourceJurisdiction.capitalGainsTax.longTermBrackets);
        taxAmount = result.tax;
        rate = result.effectiveRate;
        description = `${sourceJurisdiction.name} capital gains tax at ${(rate * 100).toFixed(1)}% effective rate`;
      }
      break;
    }
    case 'pension':
    case 'settlement':
    case 'gift': {
      // Pension/settlement taxed as income in source; gift may have gift tax
      if (event.type === 'gift' && sourceJurisdiction.giftTax.exists) {
        const result = applyBrackets(amount, sourceJurisdiction.giftTax.brackets);
        taxAmount = result.tax;
        rate = result.effectiveRate;
        description = `${sourceJurisdiction.name} gift tax at ${(rate * 100).toFixed(1)}% effective rate`;
      } else {
        description = `No specific source tax on ${event.type} in ${sourceJurisdiction.name}`;
      }
      break;
    }
  }

  return {
    layer: 'source_tax',
    name: `Source Tax (${sourceJurisdiction.name})`,
    amount: taxAmount,
    rate,
    currency: event.currency,
    description,
    citations: [
      {
        id: `src-tax-${sourceJurisdiction.code}`,
        sourceType: 'statute',
        title: `${sourceJurisdiction.name} Tax Code`,
        reference: sourceJurisdiction.source,
        url: null,
        confidence: 'statutory',
        asOfDate: sourceJurisdiction.lastUpdated,
        jurisdiction: sourceJurisdiction.code,
      },
    ],
    confidence: 'statutory',
  };
}

function computeDestinationTax(
  event: MoneyEvent,
  destJurisdiction: Jurisdiction,
): TaxLayer {
  const amount = event.amount;
  let taxAmount = 0;
  let rate = 0;
  let description = '';

  // Destination tax depends on event type
  if (event.type === 'inheritance' && destJurisdiction.estateTax.exists) {
    const result = applyBrackets(amount, destJurisdiction.estateTax.brackets);
    taxAmount = result.tax;
    rate = result.effectiveRate;
    description = `${destJurisdiction.name} estate/inheritance tax at ${(rate * 100).toFixed(1)}% effective rate`;
  } else if (event.type === 'gift' && destJurisdiction.giftTax.exists) {
    const result = applyBrackets(amount, destJurisdiction.giftTax.brackets);
    taxAmount = result.tax;
    rate = result.effectiveRate;
    description = `${destJurisdiction.name} gift tax at ${(rate * 100).toFixed(1)}% effective rate`;
  } else {
    description = `No additional ${destJurisdiction.name} tax on receiving ${event.type} proceeds`;
  }

  return {
    layer: 'destination_tax',
    name: `Destination Tax (${destJurisdiction.name})`,
    amount: taxAmount,
    rate,
    currency: event.currency,
    description,
    citations: [
      {
        id: `dest-tax-${destJurisdiction.code}`,
        sourceType: 'statute',
        title: `${destJurisdiction.name} Tax Code`,
        reference: destJurisdiction.source,
        url: null,
        confidence: 'statutory',
        asOfDate: destJurisdiction.lastUpdated,
        jurisdiction: destJurisdiction.code,
      },
    ],
    confidence: 'statutory',
  };
}

function findApplicableTreaty(
  sourceCountry: string,
  destCountry: string,
  treaties: TreatyEdge[],
): TreatyEdge | null {
  return (
    treaties.find(
      (t) =>
        (t.countries[0] === sourceCountry && t.countries[1] === destCountry) ||
        (t.countries[1] === sourceCountry && t.countries[0] === destCountry),
    ) ?? null
  );
}

function computeTreatyRelief(
  sourceTax: TaxLayer,
  destTax: TaxLayer,
  treaty: TreatyEdge | null,
): TaxLayer {
  if (!treaty) {
    return {
      layer: 'treaty_relief',
      name: 'Treaty Relief',
      amount: 0,
      rate: 0,
      currency: sourceTax.currency,
      description: 'No applicable double taxation treaty found',
      citations: [],
      confidence: 'advisory',
    };
  }

  // Apply credit method: relief = lesser of source tax and destination tax
  let reliefAmount = 0;
  let description = '';

  if (treaty.reliefMethod === 'credit') {
    reliefAmount = Math.min(sourceTax.amount, destTax.amount);
    description = `Credit method relief under ${treaty.treatyName}: lesser of source (${sourceTax.amount.toFixed(0)}) and destination (${destTax.amount.toFixed(0)}) tax credited`;
  } else if (treaty.reliefMethod === 'exemption' || treaty.reliefMethod === 'exemption_with_progression') {
    reliefAmount = destTax.amount;
    description = `Exemption method under ${treaty.treatyName}: destination tax exempted`;
  } else {
    description = `Treaty ${treaty.treatyName} exists but relief method "${treaty.reliefMethod}" yields no automatic relief`;
  }

  return {
    layer: 'treaty_relief',
    name: `Treaty Relief (${treaty.treatyName})`,
    amount: -reliefAmount, // Negative because it reduces cost
    rate: reliefAmount > 0 ? reliefAmount / Math.max(sourceTax.amount + destTax.amount, 1) : 0,
    currency: sourceTax.currency,
    description,
    citations: [
      {
        id: `treaty-${treaty.pair}`,
        sourceType: 'treaty',
        title: treaty.treatyName,
        reference: treaty.source,
        url: null,
        confidence: 'statutory',
        asOfDate: treaty.lastUpdated,
        jurisdiction: treaty.countries.join('/'),
      },
    ],
    confidence: 'statutory',
  };
}

function estimateTransferCosts(amount: number, currency: CurrencyCode): TaxLayer {
  // Estimate: 0.5-1% for banking + FX conversion
  const estimatedRate = 0.005; // 0.5%
  const estimatedCost = amount * estimatedRate;

  return {
    layer: 'transfer_costs',
    name: 'Transfer Costs (Estimate)',
    amount: estimatedCost,
    rate: estimatedRate,
    currency,
    description:
      'Estimated banking fees, wire transfer charges, and FX conversion spread. Actual costs vary by institution and corridor. This is a conservative estimate — consult your bank for exact fees.',
    citations: [],
    confidence: 'advisory',
  };
}

function assessTiming(event: MoneyEvent, sourceJurisdiction: Jurisdiction): TaxLayer {
  // Check for timing-sensitive provisions
  const timingIssues: string[] = [];

  // Check sunset provisions
  for (const sunset of sourceJurisdiction.sunsetProvisions) {
    if (sunset.effectiveDate !== 'N/A' && sunset.effectiveDate !== 'Ongoing') {
      const sunsetDate = new Date(sunset.effectiveDate);
      const eventDate = new Date(event.date);
      if (sunsetDate > eventDate) {
        timingIssues.push(`${sunset.name}: ${sunset.description}`);
      }
    }
  }

  return {
    layer: 'timing',
    name: 'Timing Considerations',
    amount: 0,
    rate: 0,
    currency: event.currency,
    description:
      timingIssues.length > 0
        ? `Timing-sensitive provisions: ${timingIssues.join('; ')}`
        : 'No immediate timing-sensitive provisions identified',
    citations: [],
    confidence: timingIssues.length > 0 ? 'interpretive' : 'advisory',
  };
}
