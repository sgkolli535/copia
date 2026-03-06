import type { PlanResult } from '@copia/types';

// ----- Types -----

export type CitationCheckResult = {
  passed: boolean;
  issues: string[];
};

// ----- Helpers -----

/**
 * Extract all numbers/monetary amounts from a narration string.
 * Matches patterns like: $1,000,000 | 1,000,000 | 40% | 0.40 | 1000000
 * Returns deduplicated numeric values.
 */
function extractNumbersFromText(text: string): number[] {
  const numbers: Set<number> = new Set();

  // Match currency amounts: $1,234,567.89 or GBP 1,234.56 or 1,234,567
  const currencyPattern = /(?:[$\u00a3\u20ac\u20b9]|USD|GBP|EUR|INR)\s*([\d,]+(?:\.\d+)?)/g;
  let match: RegExpExecArray | null;

  match = currencyPattern.exec(text);
  while (match !== null) {
    const value = parseFloat(match[1].replace(/,/g, ''));
    if (!isNaN(value)) {
      numbers.add(value);
    }
    match = currencyPattern.exec(text);
  }

  // Match standalone numbers with commas: 1,234,567.89
  const commaNumberPattern = /(?<!\w)([\d]{1,3}(?:,\d{3})+(?:\.\d+)?)/g;
  match = commaNumberPattern.exec(text);
  while (match !== null) {
    const value = parseFloat(match[1].replace(/,/g, ''));
    if (!isNaN(value)) {
      numbers.add(value);
    }
    match = commaNumberPattern.exec(text);
  }

  // Match percentages: 40%, 12.5%
  const percentPattern = /([\d]+(?:\.\d+)?)%/g;
  match = percentPattern.exec(text);
  while (match !== null) {
    const value = parseFloat(match[1]);
    if (!isNaN(value)) {
      // Store as both the percentage and the decimal equivalent
      numbers.add(value);
      numbers.add(value / 100);
    }
    match = percentPattern.exec(text);
  }

  // Match plain large numbers (5+ digits, no commas) that aren't part of other patterns
  const plainNumberPattern = /(?<!\w)(\d{5,}(?:\.\d+)?)(?!\w)/g;
  match = plainNumberPattern.exec(text);
  while (match !== null) {
    const value = parseFloat(match[1]);
    if (!isNaN(value)) {
      numbers.add(value);
    }
    match = plainNumberPattern.exec(text);
  }

  return Array.from(numbers);
}

/**
 * Collect all numeric values present anywhere in a PlanResult.
 * This includes amounts in liabilities, conflicts, treaties, filing info, etc.
 */
function collectPlanNumbers(planResult: PlanResult): Set<number> {
  const numbers = new Set<number>();

  // Top-level
  numbers.add(planResult.totalExposure);

  // Liabilities
  for (const liability of planResult.liabilities) {
    numbers.add(liability.grossAmount);
    numbers.add(liability.reliefAmount);
    numbers.add(liability.netAmount);
    numbers.add(liability.effectiveRate);
    // Also store effectiveRate as percentage (e.g., 0.40 -> 40)
    numbers.add(liability.effectiveRate * 100);

    for (const step of liability.breakdown) {
      numbers.add(step.amount);
    }
  }

  // Conflicts
  for (const conflict of planResult.conflicts) {
    numbers.add(conflict.exposureAmount);
  }

  // Treaty applications
  for (const treaty of planResult.treatyApplications) {
    numbers.add(treaty.totalRelief);

    for (const detail of treaty.reliefDetails) {
      numbers.add(detail.grossLiability);
      numbers.add(detail.reliefApplied);
      numbers.add(detail.netLiability);
    }
  }

  // Exchange rates
  for (const rate of planResult.exchangeRates) {
    numbers.add(rate.rate);
  }

  return numbers;
}

/**
 * Check if a number from the narration matches any number in the plan,
 * allowing for small floating point differences.
 */
function numberExistsInPlan(value: number, planNumbers: Set<number>): boolean {
  // Skip trivially small numbers (0, 1, 2, etc.) that are likely incidental
  if (value <= 10) {
    return true;
  }

  for (const planNum of planNumbers) {
    // Exact match
    if (planNum === value) return true;
    // Close enough (within 0.01 tolerance for floating point)
    if (Math.abs(planNum - value) < 0.01) return true;
    // Percentage tolerance: allow for rounding of displayed percentages
    if (planNum > 0 && Math.abs(planNum - value) / planNum < 0.005) return true;
  }

  return false;
}

// ----- Main Function -----

/**
 * Post-process a narration to verify that all numbers/amounts cited
 * actually exist somewhere in the PlanResult data.
 *
 * Returns { passed: true } if all numbers check out, or
 * { passed: false, issues: [...] } listing the unverified figures.
 */
export function checkCitations(narration: string, planResult: PlanResult): CitationCheckResult {
  const narrationNumbers = extractNumbersFromText(narration);
  const planNumbers = collectPlanNumbers(planResult);
  const issues: string[] = [];

  for (const num of narrationNumbers) {
    if (!numberExistsInPlan(num, planNumbers)) {
      issues.push(
        `Number ${num.toLocaleString()} found in narration but not present in PlanResult data.`,
      );
    }
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}
