import { streamText } from 'ai';
import type { ScenarioDelta } from '@copia/types';
import { getModel } from '../provider.js';
import { SCENARIO_NARRATION_SYSTEM_PROMPT } from '../prompts/v1.0.0/index.js';

/**
 * Format a ScenarioDelta into a JSON summary suitable for the LLM prompt.
 */
function formatDeltaForPrompt(delta: ScenarioDelta): string {
  return JSON.stringify(
    {
      modification: {
        type: delta.modification.type,
        description: delta.modification.description,
        params: delta.modification.params,
      },
      netImpact: delta.netImpact,
      liabilityDeltas: delta.liabilityDeltas.map((ld) => ({
        jurisdiction: ld.jurisdiction,
        taxType: ld.taxType,
        baselineAmount: ld.baselineAmount,
        scenarioAmount: ld.scenarioAmount,
        deltaAmount: ld.deltaAmount,
        deltaPct: ld.deltaPct,
      })),
      newConflicts: delta.newConflicts,
      resolvedConflicts: delta.resolvedConflicts,
      newObligations: delta.newObligations,
      removedObligations: delta.removedObligations,
      tradeOffs: delta.tradeOffs.map((t) => ({
        description: t.description,
        pros: t.pros,
        cons: t.cons,
        financialImpact: t.financialImpact,
      })),
    },
    null,
    2,
  );
}

/**
 * Convert a ScenarioDelta into a 5-part narrative using streamText.
 * Collects the full stream and returns the complete narration string.
 */
export async function narrateScenario(delta: ScenarioDelta): Promise<string> {
  const model = getModel('text');
  const deltaData = formatDeltaForPrompt(delta);

  const result = streamText({
    model,
    system: SCENARIO_NARRATION_SYSTEM_PROMPT,
    prompt: `Narrate the following scenario delta into a 5-part report. Follow the output structure exactly (State Change, Headline Impact, Mechanism, Trade-offs, Next Exploration).

Remember:
- Only cite numbers that appear in the data below.
- Use confidence-calibrated language.
- Format currency amounts with symbols and thousands separators.
- End with a disclaimer that this is informational, not legal or tax advice.

## Scenario Delta Data
${deltaData}`,
  });

  // Collect the full streamed text
  const chunks: string[] = [];
  for await (const chunk of result.textStream) {
    chunks.push(chunk);
  }

  return chunks.join('');
}
