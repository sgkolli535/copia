import type {
  MoneyEvent,
  UserProfile,
  MobilityAnalysisResult,
  AuditEntry,
  CountryCode,
  Jurisdiction,
  ScenarioModification,
  ScenarioDelta,
} from '@copia/types';
import { getJurisdiction, getCapitalControls } from '@copia/data-service';
import { loadExchangeRates, loadProfileTreaties } from '../data/registry.js';
import { determineSourceCountryStatus } from './status-determination.js';
import { analyzeCapitalControls } from './capital-controls.js';
import { computeTaxLayers } from './tax-layers.js';
import { buildRepatriationChannels } from './repatriation-channels.js';
import { mapPermittedActions } from './permitted-actions.js';

export { determineSourceCountryStatus } from './status-determination.js';
export { analyzeCapitalControls } from './capital-controls.js';
export { computeTaxLayers } from './tax-layers.js';
export { buildRepatriationChannels } from './repatriation-channels.js';
export { mapPermittedActions } from './permitted-actions.js';

const ENGINE_VERSION = '1.0.0';

/**
 * Orchestrate a full capital mobility analysis for a money event.
 * Chains: status → controls → tax layers → channels → permitted actions
 */
export async function analyzeMoneyEvent(
  event: MoneyEvent,
  profile: UserProfile,
): Promise<MobilityAnalysisResult> {
  const auditTrail: AuditEntry[] = [];
  const startTime = Date.now();

  // Load data
  const sourceJurisdiction = getJurisdiction(event.sourceCountry).jurisdiction;
  const destJurisdiction = getJurisdiction(event.destinationCountry).jurisdiction;
  const exchangeRates = await loadExchangeRates(profile);
  const { treaties } = loadProfileTreaties(profile);

  const jurisdictions = new Map<CountryCode, Jurisdiction>();
  jurisdictions.set(event.sourceCountry, sourceJurisdiction);
  jurisdictions.set(event.destinationCountry, destJurisdiction);

  // Step 1: Determine status in source country
  const status = determineSourceCountryStatus(profile, event.sourceCountry);
  auditTrail.push({
    step: 'mobility-01-status',
    timestamp: new Date().toISOString(),
    determination: `Status in ${event.sourceCountry}: ${status.status} — ${status.description}`,
    inputs: { sourceCountry: event.sourceCountry, citizenships: profile.citizenships },
    outputs: { status: status.status, confidence: status.confidence },
    citations: status.citations,
    engineVersion: ENGINE_VERSION,
  });

  // Step 2: Analyze capital controls
  const controls = analyzeCapitalControls(event, status, sourceJurisdiction);
  auditTrail.push({
    step: 'mobility-02-controls',
    timestamp: new Date().toISOString(),
    determination: controls.hasControls
      ? `Capital controls apply in ${event.sourceCountry}: ${controls.outboundLimits.length} outbound limits, approval ${controls.approvalRequired ? 'required' : 'not required'}`
      : `No capital controls in ${event.sourceCountry}`,
    inputs: { sourceCountry: event.sourceCountry, amount: event.amount },
    outputs: {
      hasControls: controls.hasControls,
      outboundLimits: controls.outboundLimits.length,
      approvalRequired: controls.approvalRequired,
    },
    citations: controls.citations,
    engineVersion: ENGINE_VERSION,
  });

  // Step 3: Compute 5-layer tax cost stack
  const taxLayers = computeTaxLayers(
    event,
    profile,
    sourceJurisdiction,
    destJurisdiction,
    treaties,
    exchangeRates,
  );
  auditTrail.push({
    step: 'mobility-03-tax-layers',
    timestamp: new Date().toISOString(),
    determination: `5-layer cost stack: total ${taxLayers.totalCost.toFixed(0)} ${taxLayers.currency} (${(taxLayers.effectiveRate * 100).toFixed(1)}% effective)`,
    inputs: { amount: event.amount, sourceCountry: event.sourceCountry, destCountry: event.destinationCountry },
    outputs: {
      totalCost: taxLayers.totalCost,
      effectiveRate: taxLayers.effectiveRate,
      netAmount: taxLayers.netAmount,
      layerCount: taxLayers.layers.length,
    },
    citations: taxLayers.layers.flatMap((l) => l.citations),
    engineVersion: ENGINE_VERSION,
  });

  // Step 4: Build repatriation channels
  const channels = buildRepatriationChannels(event, status, controls, taxLayers);
  auditTrail.push({
    step: 'mobility-04-channels',
    timestamp: new Date().toISOString(),
    determination: `${channels.length} repatriation channels identified; ${channels.filter((c) => c.recommended).length} recommended`,
    inputs: { eventType: event.type, amount: event.amount },
    outputs: { channelCount: channels.length, channels: channels.map((c) => c.name) },
    citations: channels.flatMap((c) => c.citations),
    engineVersion: ENGINE_VERSION,
  });

  // Step 5: Map permitted actions
  const permittedActions = mapPermittedActions(event, profile, status, controls, jurisdictions);
  auditTrail.push({
    step: 'mobility-05-actions',
    timestamp: new Date().toISOString(),
    determination: `${permittedActions.length} actions mapped: ${permittedActions.filter((a) => a.permitted).length} permitted, ${permittedActions.filter((a) => !a.permitted).length} prohibited`,
    inputs: { sourceCountry: event.sourceCountry, destCountry: event.destinationCountry },
    outputs: {
      totalActions: permittedActions.length,
      permitted: permittedActions.filter((a) => a.permitted).length,
      prohibited: permittedActions.filter((a) => !a.permitted).length,
    },
    citations: permittedActions.flatMap((a) => a.citations),
    engineVersion: ENGINE_VERSION,
  });

  return {
    id: crypto.randomUUID(),
    event,
    status,
    controls,
    taxLayers,
    channels,
    permittedActions,
    auditTrail,
    computedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
  };
}

/**
 * Compare repatriation scenarios by applying modifications and re-analyzing.
 */
export async function compareRepatriationScenarios(
  baseResult: MobilityAnalysisResult,
  profile: UserProfile,
  modifications: Array<{ channel: string; timing: string }>,
): Promise<Array<{ channel: string; timing: string; result: MobilityAnalysisResult }>> {
  const results: Array<{ channel: string; timing: string; result: MobilityAnalysisResult }> = [];

  for (const mod of modifications) {
    // Create a modified event with adjusted timing/channel
    const modifiedEvent: MoneyEvent = {
      ...baseResult.event,
      id: crypto.randomUUID(),
      date: mod.timing || baseResult.event.date,
      description: `${baseResult.event.description} [Channel: ${mod.channel}]`,
    };

    const result = await analyzeMoneyEvent(modifiedEvent, profile);
    results.push({ channel: mod.channel, timing: mod.timing, result });
  }

  return results;
}
