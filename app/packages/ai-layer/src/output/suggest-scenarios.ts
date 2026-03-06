import { generateObject } from 'ai';
import { z } from 'zod';
import type { PlanResult } from '@copia/types';
import { getModel } from '../provider.js';

// ----- Schema -----

const SuggestedScenarioSchema = z.object({
  title: z.string().describe('Short, descriptive title for the scenario'),
  description: z.string().describe('1-2 sentence description of what this scenario explores'),
  modificationType: z.enum([
    'relocate',
    'gift_asset',
    'restructure_ownership',
    'change_timing',
    'add_jurisdiction',
    'spousal_planning',
  ]),
  rationale: z.string().describe('Why this scenario is worth exploring, grounded in the plan data'),
});

const SuggestionsSchema = z.object({
  suggestions: z
    .array(SuggestedScenarioSchema)
    .min(2)
    .max(3)
    .describe('2-3 scenario suggestions grounded in the plan result'),
});

// ----- Types -----

export type SuggestedScenario = {
  title: string;
  description: string;
  modificationType: string;
  rationale: string;
};

// ----- Main Function -----

/**
 * Suggest 2-3 follow-up scenarios based on a PlanResult.
 * Each suggestion is grounded in the actual plan data -- referencing
 * specific liabilities, conflicts, or filing obligations that could
 * be improved.
 */
export async function suggestScenarios(planResult: PlanResult): Promise<SuggestedScenario[]> {
  const model = getModel('structured');

  // Build a concise summary of the plan for the prompt
  const liabilities = planResult.liabilities.map((l) => ({
    jurisdiction: l.jurisdiction,
    taxType: l.taxType,
    netAmount: l.netAmount,
    currency: l.currency,
    effectiveRate: l.effectiveRate,
  }));

  const conflicts = planResult.conflicts.map((c) => ({
    jurisdictions: c.jurisdictions,
    description: c.description,
    exposureAmount: c.exposureAmount,
  }));

  const treaties = planResult.treatyApplications.map((t) => ({
    treaty: t.treaty,
    totalRelief: t.totalRelief,
  }));

  const planSummary = JSON.stringify(
    {
      totalExposure: planResult.totalExposure,
      reportingCurrency: planResult.reportingCurrency,
      liabilities,
      conflicts,
      treatyApplications: treaties,
      filingObligationCount: planResult.filingObligations.length,
    },
    null,
    2,
  );

  const { object } = await generateObject({
    model,
    schema: SuggestionsSchema,
    system: `You are a cross-border estate planning assistant. Based on a computed tax plan result, suggest 2-3 scenario modifications the user could explore to potentially reduce their tax exposure, resolve conflicts, or simplify their obligations.

Rules:
1. Each suggestion MUST be grounded in the actual plan data. Reference specific liabilities, conflicts, or obligations.
2. Suggestions should be diverse - try to cover different modification types.
3. Prioritize scenarios with the highest potential impact.
4. Be specific about what would change and why it might help.
5. Do not suggest anything that would be illegal or constitute tax evasion.
6. Frame suggestions as educational explorations, not advice.`,
    prompt: `Based on the following plan result, suggest 2-3 follow-up scenarios worth exploring:

${planSummary}`,
  });

  return object.suggestions;
}
