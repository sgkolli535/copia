import { analyzeScenario } from '@copia/rule-engine';
import type { ScenarioModification, ScenarioParams } from '@copia/types';
import { randomUUID } from 'node:crypto';
import { ComputeScenarioDeltaInput } from '../schemas/index.js';
import { getProfile, getPlan } from '../state/session-store.js';

/**
 * compute_scenario_delta tool handler.
 *
 * Takes a scenario modification, retrieves the stored profile
 * and baseline plan, invokes the rule engine's scenario
 * analysis pipeline, and returns the delta.
 *
 * The rule engine's `analyzeScenario` function:
 * 1. Applies the modification to a clone of the profile
 * 2. Computes a new estate plan for the modified profile
 * 3. Computes the delta between the baseline and scenario plans
 * 4. Returns a ScenarioDelta
 */
export async function handleComputeScenarioDelta(args: unknown): Promise<string> {
  const input = ComputeScenarioDeltaInput.parse(args);

  const profile = getProfile();
  if (!profile) {
    throw new Error(
      'No profile stored in the current session. Call parse_user_profile first.',
    );
  }

  const baselinePlan = getPlan();
  if (!baselinePlan) {
    throw new Error(
      'No baseline plan stored in the current session. Call compute_estate_plan first.',
    );
  }

  const modification: ScenarioModification = {
    id: randomUUID(),
    type: input.modification.type,
    description: input.modification.description,
    params: {
      type: input.modification.type,
      ...input.modification.params,
    } as ScenarioParams,
  };

  const { delta } = await analyzeScenario(profile, baselinePlan, modification);

  return JSON.stringify({
    deltaId: delta.id,
    baselinePlanId: delta.baselinePlanId,
    scenarioPlanId: delta.scenarioPlanId,
    modification: {
      type: delta.modification.type,
      description: delta.modification.description,
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
    tradeOffs: delta.tradeOffs,
    computedAt: delta.computedAt,
    message: `Scenario "${modification.description}" yields a net impact of ${delta.netImpact >= 0 ? '+' : ''}${delta.netImpact.toLocaleString()} in the reporting currency.`,
  });
}
