import type { PlanResult } from '@copia/types';

// ----- Types -----

export type SanityCheckResult = {
  passed: boolean;
  issues: string[];
};

// ----- Main Function -----

/**
 * Perform basic sanity validation on a PlanResult.
 *
 * Checks:
 * 1. Total liability does not exceed total assets (approximated by totalExposure).
 * 2. No sunset provisions have already passed (stale sunset dates).
 * 3. All liabilities have at least one citation.
 * 4. Net liability amounts are non-negative.
 */
export function sanityCheck(planResult: PlanResult): SanityCheckResult {
  const issues: string[] = [];
  const now = new Date();

  // --- Check 1: Liability does not exceed total assets ---
  // totalExposure represents the total tax exposure; individual net liabilities
  // should not wildly exceed the total exposure figure.
  const totalNetLiability = planResult.liabilities.reduce((sum, l) => sum + l.netAmount, 0);
  if (totalNetLiability > planResult.totalExposure * 1.01) {
    // Allow 1% tolerance for rounding/currency conversion
    issues.push(
      `Sum of net liabilities (${totalNetLiability.toLocaleString()}) exceeds ` +
        `total exposure (${planResult.totalExposure.toLocaleString()}). ` +
        `This suggests an inconsistency in the calculation.`,
    );
  }

  // --- Check 2: No stale sunset dates ---
  // Walk the audit trail for any sunset-related entries, and check
  // filingObligations for past deadlines if they appear date-like.
  for (const entry of planResult.auditTrail) {
    if (entry.outputs && typeof entry.outputs === 'object') {
      const outputStr = JSON.stringify(entry.outputs);
      // Look for effectiveDate patterns in outputs
      const dateMatches = outputStr.match(/\d{4}-\d{2}-\d{2}/g);
      if (dateMatches) {
        for (const dateStr of dateMatches) {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime()) && date < now) {
            // Only flag if it looks like a sunset/effective date (not historical dates)
            if (
              outputStr.includes('sunset') ||
              outputStr.includes('effective') ||
              outputStr.includes('expir')
            ) {
              issues.push(
                `Stale date found in audit trail: ${dateStr} has already passed. ` +
                  `Step: "${entry.step}" - "${entry.determination}". ` +
                  `Rules based on this date may no longer be valid.`,
              );
            }
          }
        }
      }
    }
  }

  // --- Check 3: All liabilities have citations ---
  for (const liability of planResult.liabilities) {
    if (!liability.citations || liability.citations.length === 0) {
      issues.push(
        `Liability "${liability.jurisdiction} ${liability.taxType}" (ID: ${liability.id}) ` +
          `has no supporting citations. All liabilities should reference source material.`,
      );
    }
  }

  // --- Check 4: Net amounts are non-negative ---
  for (const liability of planResult.liabilities) {
    if (liability.netAmount < 0) {
      issues.push(
        `Liability "${liability.jurisdiction} ${liability.taxType}" (ID: ${liability.id}) ` +
          `has a negative net amount: ${liability.netAmount}. Net liabilities should be >= 0.`,
      );
    }
  }

  // Additional: gross amount should be >= net amount (relief should not increase liability)
  for (const liability of planResult.liabilities) {
    if (liability.netAmount > liability.grossAmount) {
      issues.push(
        `Liability "${liability.jurisdiction} ${liability.taxType}" (ID: ${liability.id}) ` +
          `has net amount (${liability.netAmount}) exceeding gross amount (${liability.grossAmount}). ` +
          `Treaty relief should reduce, not increase, liability.`,
      );
    }
  }

  // Additional: relief amount should not be negative
  for (const liability of planResult.liabilities) {
    if (liability.reliefAmount < 0) {
      issues.push(
        `Liability "${liability.jurisdiction} ${liability.taxType}" (ID: ${liability.id}) ` +
          `has a negative relief amount: ${liability.reliefAmount}. Relief should be >= 0.`,
      );
    }
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}
