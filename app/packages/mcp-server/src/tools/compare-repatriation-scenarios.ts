import { compareRepatriationScenarios } from '@copia/rule-engine';
import { RepatriationScenarioInput } from '../schemas/index.js';
import { getProfile, getMobilityResult } from '../state/session-store.js';

export async function handleCompareRepatriationScenarios(args: unknown): Promise<string> {
  const input = RepatriationScenarioInput.parse(args);

  const profile = getProfile();
  if (!profile) {
    throw new Error(
      'No profile stored. Call parse_user_profile first.',
    );
  }

  const mobilityResult = getMobilityResult();
  if (!mobilityResult) {
    throw new Error(
      'No mobility analysis result stored. Call analyze_money_event first.',
    );
  }

  const results = await compareRepatriationScenarios(
    mobilityResult,
    profile,
    input.modifications,
  );

  return JSON.stringify({
    baseEvent: {
      type: mobilityResult.event.type,
      amount: mobilityResult.event.amount,
      sourceCountry: mobilityResult.event.sourceCountry,
      destinationCountry: mobilityResult.event.destinationCountry,
    },
    comparisons: results.map((r) => ({
      channel: r.channel,
      timing: r.timing,
      taxLayers: {
        totalCost: r.result.taxLayers.totalCost,
        effectiveRate: r.result.taxLayers.effectiveRate,
        netAmount: r.result.taxLayers.netAmount,
      },
      channels: r.result.channels.map((c) => ({
        name: c.name,
        totalCost: c.totalCost,
        recommended: c.recommended,
      })),
    })),
  });
}
