import { streamText } from 'ai';
import type { PlanResult } from '@copia/types';
import { getModel } from '../provider.js';
import { PLAN_NARRATION_SYSTEM_PROMPT } from '../prompts/v1.0.0/index.js';

/**
 * Format a PlanResult into a JSON summary suitable for the LLM prompt.
 * This keeps the prompt focused on the data the LLM needs to narrate.
 */
function formatPlanForPrompt(planResult: PlanResult): string {
  const liabilitySummary = planResult.liabilities.map((l) => ({
    jurisdiction: l.jurisdiction,
    taxType: l.taxType,
    grossAmount: l.grossAmount,
    reliefAmount: l.reliefAmount,
    netAmount: l.netAmount,
    currency: l.currency,
    effectiveRate: l.effectiveRate,
    confidence: l.confidence,
    citations: l.citations.map((c) => ({
      title: c.title,
      reference: c.reference,
      confidence: c.confidence,
    })),
    breakdown: l.breakdown,
  }));

  const conflictSummary = planResult.conflicts.map((c) => ({
    jurisdictions: c.jurisdictions,
    description: c.description,
    exposureAmount: c.exposureAmount,
    currency: c.currency,
    resolution: c.resolution,
    confidence: c.confidence,
    citations: c.citations.map((ci) => ({
      title: ci.title,
      reference: ci.reference,
    })),
  }));

  const treatySummary = planResult.treatyApplications.map((t) => ({
    treaty: t.treaty,
    reliefMethod: t.reliefMethod,
    totalRelief: t.totalRelief,
    currency: t.currency,
    reliefDetails: t.reliefDetails,
  }));

  const obligationSummary = planResult.filingObligations.map((o) => ({
    jurisdiction: o.jurisdiction,
    name: o.name,
    description: o.description,
    deadline: o.deadline,
    penalty: o.penalty,
    confidence: o.confidence,
  }));

  return JSON.stringify(
    {
      totalExposure: planResult.totalExposure,
      reportingCurrency: planResult.reportingCurrency,
      liabilities: liabilitySummary,
      conflicts: conflictSummary,
      treatyApplications: treatySummary,
      filingObligations: obligationSummary,
      exchangeRates: planResult.exchangeRates,
    },
    null,
    2,
  );
}

/**
 * Convert a PlanResult into narrated prose using streamText.
 * Collects the full stream and returns the complete narration string.
 */
export async function narratePlan(planResult: PlanResult): Promise<string> {
  const model = getModel('text');
  const planData = formatPlanForPrompt(planResult);

  const result = streamText({
    model,
    system: PLAN_NARRATION_SYSTEM_PROMPT,
    prompt: `Narrate the following estate and tax plan result into a structured, readable report. Follow the output structure exactly (Headline Summary, Key Findings, Liability Breakdown, Conflicts & Risks, Filing Obligations, Recommendations).

Remember:
- Only cite numbers that appear in the data below.
- Use confidence-calibrated language for each item.
- Format currency amounts with symbols and thousands separators.
- End with a disclaimer that this is informational, not legal or tax advice.

## Plan Result Data
${planData}`,
  });

  // Collect the full streamed text
  const chunks: string[] = [];
  for await (const chunk of result.textStream) {
    chunks.push(chunk);
  }

  return chunks.join('');
}
