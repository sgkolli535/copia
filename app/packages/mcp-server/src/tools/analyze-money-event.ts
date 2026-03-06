import { randomUUID } from 'node:crypto';
import type { MoneyEvent } from '@copia/types';
import { analyzeMoneyEvent } from '@copia/rule-engine';
import { MoneyEventInput } from '../schemas/index.js';
import { getProfile, setMobilityResult } from '../state/session-store.js';

export async function handleAnalyzeMoneyEvent(args: unknown): Promise<string> {
  const input = MoneyEventInput.parse(args);

  const profile = getProfile();
  if (!profile) {
    throw new Error(
      'No profile stored. Call parse_user_profile first to set up the user profile.',
    );
  }

  const event: MoneyEvent = {
    id: randomUUID(),
    type: input.type,
    sourceCountry: input.sourceCountry,
    destinationCountry: input.destinationCountry,
    amount: input.amount,
    currency: input.currency,
    date: input.date,
    relatedAsset: input.relatedAsset,
    relationship: input.relationship,
    userStatusInSource: input.userStatusInSource ?? 'non_resident',
    description: input.description,
  };

  const result = await analyzeMoneyEvent(event, profile);

  // Store in session for subsequent tools
  setMobilityResult(result);

  return JSON.stringify({
    id: result.id,
    status: {
      country: result.status.sourceCountry,
      status: result.status.status,
      description: result.status.description,
      confidence: result.status.confidence,
    },
    controls: {
      hasControls: result.controls.hasControls,
      outboundLimits: result.controls.outboundLimits.length,
      approvalRequired: result.controls.approvalRequired,
      documentationRequired: result.controls.documentationRequired.length,
    },
    taxLayers: {
      totalCost: result.taxLayers.totalCost,
      effectiveRate: result.taxLayers.effectiveRate,
      netAmount: result.taxLayers.netAmount,
      layers: result.taxLayers.layers.map((l) => ({
        layer: l.layer,
        name: l.name,
        amount: l.amount,
        rate: l.rate,
        description: l.description,
        confidence: l.confidence,
      })),
    },
    channels: result.channels.map((c) => ({
      name: c.name,
      totalCost: c.totalCost,
      timeline: c.timeline,
      annualLimit: c.annualLimit,
      recommended: c.recommended,
    })),
    permittedActions: {
      total: result.permittedActions.length,
      permitted: result.permittedActions.filter((a) => a.permitted).length,
      prohibited: result.permittedActions.filter((a) => !a.permitted).length,
    },
    auditTrailSteps: result.auditTrail.length,
    computedAt: result.computedAt,
  });
}
