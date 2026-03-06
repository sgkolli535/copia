import type {
  MoneyEvent,
  StatusResult,
  ControlResult,
  TaxLayerResult,
  RepatriationChannel,
  TaxLayer,
  SourceCitation,
} from '@copia/types';

/**
 * Build repatriation channels based on event, status, controls, and tax layers.
 * Each channel represents a distinct path to move money from source to destination.
 */
export function buildRepatriationChannels(
  event: MoneyEvent,
  status: StatusResult,
  controls: ControlResult,
  taxLayers: TaxLayerResult,
): RepatriationChannel[] {
  const channels: RepatriationChannel[] = [];

  // Channel 1: Hold in source country
  channels.push(buildHoldInSourceChannel(event, controls));

  // Channel 2: Immediate repatriation
  channels.push(buildImmediateRepatriationChannel(event, status, controls, taxLayers));

  // Channel 3: Phased repatriation (if controls exist with annual limits)
  if (controls.hasControls && controls.outboundLimits.length > 0) {
    const phasedChannel = buildPhasedRepatriationChannel(event, status, controls, taxLayers);
    if (phasedChannel) {
      channels.push(phasedChannel);
    }
  }

  // Channel 4: Local reinvestment
  channels.push(buildLocalReinvestmentChannel(event, status, controls));

  return channels;
}

function buildHoldInSourceChannel(
  event: MoneyEvent,
  controls: ControlResult,
): RepatriationChannel {
  const accountDocs = controls.accountRequirements
    .filter((a) => !a.repatriable || a.repatriable)
    .map((a) => `${a.accountType} account: ${a.description}`);

  return {
    id: `channel-hold-${event.sourceCountry}`,
    name: `Hold in ${event.sourceCountry}`,
    description: `Keep funds in ${event.sourceCountry} in a compliant account. Earn local returns without repatriation constraints.`,
    constraints: [
      'Funds remain subject to source country regulations',
      'Local investment options and returns apply',
      'May need to maintain compliant account type',
    ],
    costLayers: [],
    totalCost: 0,
    timeline: 'Immediate — no transfer needed',
    documentation: accountDocs.length > 0 ? accountDocs : ['Standard bank account documentation'],
    annualLimit: null,
    recommended: false,
    citations: controls.citations,
  };
}

function buildImmediateRepatriationChannel(
  event: MoneyEvent,
  status: StatusResult,
  controls: ControlResult,
  taxLayers: TaxLayerResult,
): RepatriationChannel {
  const constraints: string[] = [];
  let annualLimit: number | null = null;

  if (controls.hasControls) {
    for (const limit of controls.outboundLimits) {
      if (limit.annualLimitUSD !== null) {
        constraints.push(`Annual limit: USD ${limit.annualLimitUSD.toLocaleString()} (${limit.name})`);
        if (annualLimit === null || limit.annualLimitUSD < annualLimit) {
          annualLimit = limit.annualLimitUSD;
        }
      }
      constraints.push(limit.conditions);
    }
  }

  if (controls.approvalRequired) {
    const timeline = controls.approvalThresholds
      .map((t) => `${t.authority} approval: ~${t.timelineWeeks} weeks`)
      .join('; ');
    constraints.push(`Regulatory approval required: ${timeline}`);
  }

  const exceedsLimit = annualLimit !== null && event.amount > annualLimit;

  return {
    id: `channel-immediate-${event.sourceCountry}-${event.destinationCountry}`,
    name: `Immediate Repatriation to ${event.destinationCountry}`,
    description: exceedsLimit
      ? `Transfer funds to ${event.destinationCountry}. Amount exceeds annual limit — may require phased approach or approval.`
      : `Transfer full amount to ${event.destinationCountry} in a single transaction.`,
    constraints,
    costLayers: taxLayers.layers,
    totalCost: taxLayers.totalCost,
    timeline: controls.approvalRequired
      ? `${Math.max(...controls.approvalThresholds.map((t) => t.timelineWeeks))} weeks (with approval)`
      : '1-5 business days',
    documentation: controls.documentationRequired,
    annualLimit,
    recommended: !exceedsLimit && !controls.approvalRequired,
    citations: [...taxLayers.layers.flatMap((l) => l.citations), ...controls.citations],
  };
}

function buildPhasedRepatriationChannel(
  event: MoneyEvent,
  status: StatusResult,
  controls: ControlResult,
  taxLayers: TaxLayerResult,
): RepatriationChannel | null {
  // Find the most restrictive annual limit
  let annualLimit: number | null = null;
  for (const limit of controls.outboundLimits) {
    if (limit.annualLimitUSD !== null) {
      if (annualLimit === null || limit.annualLimitUSD < annualLimit) {
        annualLimit = limit.annualLimitUSD;
      }
    }
  }

  if (annualLimit === null || event.amount <= annualLimit) {
    return null; // No need for phasing
  }

  const yearsNeeded = Math.ceil(event.amount / annualLimit);
  const perYearAmount = Math.min(event.amount, annualLimit);

  return {
    id: `channel-phased-${event.sourceCountry}-${event.destinationCountry}`,
    name: `Phased Repatriation (${yearsNeeded} years)`,
    description: `Transfer USD ${perYearAmount.toLocaleString()}/year over ${yearsNeeded} years to stay within annual limits.`,
    constraints: [
      `Annual limit: USD ${annualLimit.toLocaleString()}`,
      `Total amount: ${event.currency} ${event.amount.toLocaleString()} requires ${yearsNeeded} financial years`,
      'Each tranche requires fresh documentation',
      'Exchange rate risk over multi-year period',
    ],
    costLayers: taxLayers.layers,
    totalCost: taxLayers.totalCost,
    timeline: `${yearsNeeded} financial years`,
    documentation: [
      ...controls.documentationRequired,
      'Annual documentation renewal for each tranche',
    ],
    annualLimit,
    recommended: true,
    citations: controls.citations,
  };
}

function buildLocalReinvestmentChannel(
  event: MoneyEvent,
  status: StatusResult,
  controls: ControlResult,
): RepatriationChannel {
  return {
    id: `channel-reinvest-${event.sourceCountry}`,
    name: `Reinvest Locally in ${event.sourceCountry}`,
    description: `Deploy funds within ${event.sourceCountry} in permitted investments. Avoids repatriation limits and transfer costs.`,
    constraints: [
      'Investment options subject to status-based restrictions',
      'Returns earned locally may have repatriation implications',
      'Must comply with local investment regulations for status type',
    ],
    costLayers: [],
    totalCost: 0,
    timeline: 'Immediate — no transfer needed',
    documentation: ['Investment KYC documentation', 'PAN / Tax ID in source country'],
    annualLimit: null,
    recommended: false,
    citations: controls.citations,
  };
}
