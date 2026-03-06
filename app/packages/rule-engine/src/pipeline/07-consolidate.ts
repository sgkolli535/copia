import type {
  CurrencyCode,
  Liability,
  Conflict,
  TreatyApplication,
  FilingObligation,
  AuditEntry,
  ExchangeRateSnapshot,
  PlanResult,
} from '@copia/types';
import { getRate } from '../calculators/currency.js';

const ENGINE_VERSION = '1.0.0';
const PROMPT_VERSION = '1.0.0';

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

/**
 * Generate a unique plan ID based on the profile ID and timestamp.
 */
function generatePlanId(profileId: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `plan-${profileId}-${ts}-${rand}`;
}

/**
 * Compute total exposure in the reporting currency.
 *
 * Sums all net liability amounts, converting each to the reporting
 * currency using the provided exchange rate map.
 */
function computeTotalExposure(
  liabilities: Liability[],
  reportingCurrency: CurrencyCode,
  exchangeRateMap: Map<string, number>,
): number {
  let total = 0;

  for (const liability of liabilities) {
    if (liability.netAmount <= 0) continue;

    if (liability.currency === reportingCurrency) {
      total += liability.netAmount;
    } else {
      try {
        const rate = getRate(exchangeRateMap, liability.currency, reportingCurrency);
        total += liability.netAmount * rate;
      } catch {
        // If we can't convert, include the raw amount as a fallback.
        // This is imperfect but better than silently dropping a liability.
        total += liability.netAmount;
      }
    }
  }

  return Math.round(total * 100) / 100; // Round to cents
}

// -----------------------------------------------------------------------
// Main exported function
// -----------------------------------------------------------------------

/**
 * Consolidate all pipeline outputs into a final PlanResult.
 *
 * This is the terminal step that gathers liabilities, conflicts,
 * treaty applications, filing obligations, audit entries, and exchange
 * rates into the canonical PlanResult shape. It computes the
 * totalExposure in the reporting currency, stamps the result with
 * engine/prompt versions, and attaches the full audit trail.
 */
export function consolidateResult(
  profileId: string,
  liabilities: Liability[],
  conflicts: Conflict[],
  treatyApplications: TreatyApplication[],
  filingObligations: FilingObligation[],
  auditEntries: AuditEntry[],
  exchangeRates: ExchangeRateSnapshot[],
  reportingCurrency: CurrencyCode,
  exchangeRateMap: Map<string, number>,
  warnings: string[] = [],
): PlanResult {
  const totalExposure = computeTotalExposure(
    liabilities,
    reportingCurrency,
    exchangeRateMap,
  );

  // Build the consolidation audit entry
  const consolidationAudit: AuditEntry = {
    step: '07-consolidate',
    timestamp: new Date().toISOString(),
    determination:
      `Consolidated plan for profile ${profileId}. ` +
      `Total exposure: ${reportingCurrency} ${totalExposure.toLocaleString()}. ` +
      `${liabilities.length} liability(ies), ${conflicts.length} conflict(s), ` +
      `${treatyApplications.length} treaty application(s), ${filingObligations.length} filing obligation(s).`,
    inputs: {
      profileId,
      reportingCurrency,
      liabilityCount: liabilities.length,
      conflictCount: conflicts.length,
      treatyApplicationCount: treatyApplications.length,
      filingObligationCount: filingObligations.length,
      exchangeRateCount: exchangeRates.length,
    },
    outputs: {
      totalExposure,
      reportingCurrency,
    },
    citations: [],
    engineVersion: ENGINE_VERSION,
  };

  const fullAuditTrail = [...auditEntries, consolidationAudit];

  return {
    id: generatePlanId(profileId),
    profileId,
    liabilities,
    totalExposure,
    reportingCurrency,
    conflicts,
    treatyApplications,
    filingObligations,
    auditTrail: fullAuditTrail,
    computedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
    promptVersion: PROMPT_VERSION,
    exchangeRates,
    warnings,
  };
}
