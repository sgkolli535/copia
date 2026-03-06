export { applyModification } from './apply-modification.js';
export { computeDelta } from './compute-delta.js';

import type { UserProfile, ScenarioModification, ScenarioDelta, PlanResult } from '@copia/types';
import { applyModification } from './apply-modification.js';
import { computeDelta } from './compute-delta.js';
import { computeEstatePlan } from '../compute-estate-plan.js';

/**
 * Full scenario analysis: apply modification, compute new plan, diff against baseline.
 *
 * This is the primary entry point for scenario exploration. It:
 * 1. Applies the modification to produce a hypothetical profile
 * 2. Runs the full estate plan computation on the modified profile
 * 3. Compares the scenario plan against the baseline to produce a structured delta
 *
 * @param profile - The original (unmodified) user profile
 * @param baseline - The already-computed plan result for the original profile
 * @param modification - The scenario modification to explore
 * @returns The scenario plan and a delta summarizing all differences
 */
export async function analyzeScenario(
  profile: UserProfile,
  baseline: PlanResult,
  modification: ScenarioModification,
): Promise<{ scenarioPlan: PlanResult; delta: ScenarioDelta }> {
  // Step 1: Apply the modification to a cloned profile
  const modifiedProfile = applyModification(profile, modification);

  // Step 2: Compute the estate plan for the modified profile
  const scenarioPlan = await computeEstatePlan(modifiedProfile);

  // Step 3: Compute the delta between baseline and scenario
  const delta = computeDelta(baseline, scenarioPlan, modification);

  return { scenarioPlan, delta };
}
