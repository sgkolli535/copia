import { computeEstatePlan } from '@copia/rule-engine';
import { ComputeEstatePlanInput } from '../schemas/index.js';
import { getProfile, setPlan } from '../state/session-store.js';

/**
 * compute_estate_plan tool handler.
 *
 * Retrieves the stored profile, invokes the rule engine's
 * computeEstatePlan pipeline, stores the resulting PlanResult
 * in the session, and returns a summary.
 */
export async function handleComputeEstatePlan(args: unknown): Promise<string> {
  const input = ComputeEstatePlanInput.parse(args);

  const profile = getProfile();
  if (!profile) {
    throw new Error(
      'No profile stored in the current session. Call parse_user_profile first.',
    );
  }

  // Allow an optional profileId check
  if (input.profileId && input.profileId !== profile.id) {
    throw new Error(
      `Profile ID mismatch: expected "${profile.id}", got "${input.profileId}".`,
    );
  }

  const planResult = await computeEstatePlan(profile);

  setPlan(planResult);

  return JSON.stringify({
    planId: planResult.id,
    profileId: planResult.profileId,
    totalExposure: planResult.totalExposure,
    reportingCurrency: planResult.reportingCurrency,
    liabilityCount: planResult.liabilities.length,
    liabilities: planResult.liabilities.map((l) => ({
      jurisdiction: l.jurisdiction,
      taxType: l.taxType,
      grossAmount: l.grossAmount,
      reliefAmount: l.reliefAmount,
      netAmount: l.netAmount,
      currency: l.currency,
      effectiveRate: l.effectiveRate,
      confidence: l.confidence,
    })),
    conflictCount: planResult.conflicts.length,
    conflicts: planResult.conflicts.map((c) => ({
      jurisdictions: c.jurisdictions,
      description: c.description,
      exposureAmount: c.exposureAmount,
      resolution: c.resolution,
    })),
    treatyApplicationCount: planResult.treatyApplications.length,
    filingObligationCount: planResult.filingObligations.length,
    computedAt: planResult.computedAt,
    engineVersion: planResult.engineVersion,
    message: `Estate plan computed: ${planResult.liabilities.length} liabilities totalling ${planResult.reportingCurrency} ${planResult.totalExposure.toLocaleString()}, ${planResult.conflicts.length} conflicts identified.`,
  });
}
