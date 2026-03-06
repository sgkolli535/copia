import { streamText } from 'ai';
import type { MobilityAnalysisResult } from '@copia/types';
import { getModel } from '../provider.js';
import { MOBILITY_NARRATION_SYSTEM_PROMPT } from '../prompts/v1.0.0/index.js';

/**
 * Format a MobilityAnalysisResult into a JSON summary for the LLM prompt.
 */
function formatMobilityForPrompt(result: MobilityAnalysisResult): string {
  const statusSummary = {
    sourceCountry: result.status.sourceCountry,
    status: result.status.status,
    description: result.status.description,
    confidence: result.status.confidence,
    citations: result.status.citations.map((c) => ({
      title: c.title,
      reference: c.reference,
    })),
  };

  const controlsSummary = {
    hasControls: result.controls.hasControls,
    outboundLimits: result.controls.outboundLimits.map((l) => ({
      name: l.name,
      annualLimitUSD: l.annualLimitUSD,
      conditions: l.conditions,
    })),
    approvalRequired: result.controls.approvalRequired,
    approvalThresholds: result.controls.approvalThresholds.map((t) => ({
      name: t.name,
      thresholdUSD: t.thresholdUSD,
      authority: t.authority,
      timelineWeeks: t.timelineWeeks,
    })),
    documentationRequired: result.controls.documentationRequired,
    exemptions: result.controls.exemptions,
  };

  const taxLayersSummary = {
    totalCost: result.taxLayers.totalCost,
    effectiveRate: result.taxLayers.effectiveRate,
    netAmount: result.taxLayers.netAmount,
    currency: result.taxLayers.currency,
    layers: result.taxLayers.layers.map((l) => ({
      layer: l.layer,
      name: l.name,
      amount: l.amount,
      rate: l.rate,
      description: l.description,
      confidence: l.confidence,
      citations: l.citations.map((c) => ({
        title: c.title,
        reference: c.reference,
      })),
    })),
  };

  const channelsSummary = result.channels.map((c) => ({
    name: c.name,
    description: c.description,
    constraints: c.constraints,
    totalCost: c.totalCost,
    timeline: c.timeline,
    annualLimit: c.annualLimit,
    recommended: c.recommended,
    documentation: c.documentation,
  }));

  const actionsSummary = result.permittedActions.map((a) => ({
    name: a.name,
    category: a.category,
    country: a.country,
    permitted: a.permitted,
    restrictions: a.restrictions,
    taxConsequences: a.taxConsequences,
    filingObligations: a.filingObligations,
    repatriability: a.repatriability,
    confidence: a.confidence,
    citations: a.citations.map((c) => ({
      title: c.title,
      reference: c.reference,
    })),
  }));

  return JSON.stringify(
    {
      event: {
        type: result.event.type,
        sourceCountry: result.event.sourceCountry,
        destinationCountry: result.event.destinationCountry,
        amount: result.event.amount,
        currency: result.event.currency,
        date: result.event.date,
        description: result.event.description,
      },
      status: statusSummary,
      controls: controlsSummary,
      taxLayers: taxLayersSummary,
      channels: channelsSummary,
      permittedActions: actionsSummary,
    },
    null,
    2,
  );
}

/**
 * Stream a 6-section narrative from a MobilityAnalysisResult.
 *
 * Sections:
 * 1. Status Summary
 * 2. Capital Controls
 * 3. Cost Stack
 * 4. Repatriation Channels
 * 5. Permitted Actions
 * 6. Next Steps
 */
export async function narrateMobility(
  result: MobilityAnalysisResult,
): Promise<ReturnType<typeof streamText>> {
  const model = getModel('text');
  const formattedData = formatMobilityForPrompt(result);

  return streamText({
    model,
    system: MOBILITY_NARRATION_SYSTEM_PROMPT,
    prompt: `Here is the capital mobility analysis result to narrate:\n\n${formattedData}`,
  });
}
