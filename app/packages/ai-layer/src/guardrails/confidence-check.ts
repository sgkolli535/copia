import type { PlanResult, ConfidenceTier } from '@copia/types';

// ----- Types -----

export type ConfidenceCheckResult = {
  passed: boolean;
  issues: string[];
};

// ----- Keyword Heuristics -----

/**
 * Keywords/phrases that signal definitive (statutory) language.
 * These should NOT appear in sentences about advisory-tier items.
 */
const STATUTORY_KEYWORDS = [
  'must',
  'is required',
  'are required',
  'shall',
  'is obligated',
  'are obligated',
  'mandatory',
  'is subject to',
  'the tax rate is',
  'the rate is',
  'will be taxed',
  'is taxed at',
];

/**
 * Keywords/phrases that signal hedged (interpretive) language.
 */
const INTERPRETIVE_KEYWORDS = [
  'likely',
  'generally',
  'typically',
  'in most cases',
  'based on current interpretation',
  'under current guidance',
  'usually',
  'tends to',
  'is expected to',
  'in practice',
];

/**
 * Keywords/phrases that signal suggestive (advisory) language.
 * These should NOT appear in sentences about statutory-tier items.
 */
const ADVISORY_KEYWORDS = [
  'consider',
  'may want to',
  'might want to',
  'could consider',
  'it may be beneficial',
  'you might explore',
  'worth considering',
  'optionally',
  'one option is',
  'a potential approach',
];

// ----- Helpers -----

/**
 * Split narration into sentences for analysis.
 */
function splitIntoSentences(text: string): string[] {
  // Split on period, exclamation, question mark followed by space or end
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Check if a sentence contains any of the given keywords (case-insensitive).
 */
function containsKeyword(sentence: string, keywords: string[]): string | null {
  const lower = sentence.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) {
      return kw;
    }
  }
  return null;
}

/**
 * Extract all items with confidence tiers from a PlanResult for reference.
 */
function extractConfidenceItems(
  planResult: PlanResult,
): Array<{ description: string; confidence: ConfidenceTier; source: string }> {
  const items: Array<{ description: string; confidence: ConfidenceTier; source: string }> = [];

  for (const liability of planResult.liabilities) {
    items.push({
      description: `${liability.jurisdiction} ${liability.taxType} liability`,
      confidence: liability.confidence,
      source: 'liability',
    });
  }

  for (const conflict of planResult.conflicts) {
    items.push({
      description: conflict.description,
      confidence: conflict.confidence,
      source: 'conflict',
    });
  }

  for (const obligation of planResult.filingObligations) {
    items.push({
      description: `${obligation.jurisdiction} ${obligation.name}`,
      confidence: obligation.confidence,
      source: 'filing_obligation',
    });
  }

  return items;
}

/**
 * Try to match a sentence to a confidence-tiered item by checking
 * if the sentence references the item's jurisdiction, tax type, or description.
 */
function findRelatedItem(
  sentence: string,
  items: Array<{ description: string; confidence: ConfidenceTier; source: string }>,
): { description: string; confidence: ConfidenceTier; source: string } | null {
  const lower = sentence.toLowerCase();

  for (const item of items) {
    // Check if the sentence references this item
    const descWords = item.description.toLowerCase().split(/\s+/);
    const matchCount = descWords.filter((w) => w.length > 3 && lower.includes(w)).length;
    // If more than half the significant words match, consider it related
    if (matchCount >= Math.max(1, Math.floor(descWords.length * 0.4))) {
      return item;
    }
  }

  return null;
}

// ----- Main Function -----

/**
 * Verify that the language used in a narration matches the confidence
 * tiers of the PlanResult items being discussed.
 *
 * Checks:
 * 1. Statutory items should not use advisory/hedging language.
 * 2. Advisory items should not use definitive/statutory language.
 * 3. Interpretive items should use appropriately hedged language.
 */
export function checkConfidence(narration: string, planResult: PlanResult): ConfidenceCheckResult {
  const items = extractConfidenceItems(planResult);
  const sentences = splitIntoSentences(narration);
  const issues: string[] = [];

  for (const sentence of sentences) {
    const relatedItem = findRelatedItem(sentence, items);
    if (!relatedItem) {
      // Can't determine which item this sentence relates to; skip
      continue;
    }

    const { confidence, description } = relatedItem;

    if (confidence === 'statutory') {
      // Statutory items should NOT use advisory language
      const advisoryMatch = containsKeyword(sentence, ADVISORY_KEYWORDS);
      if (advisoryMatch) {
        issues.push(
          `Statutory item "${description}" uses advisory language ("${advisoryMatch}"). ` +
            `Statutory items should use definitive language like "is", "must", "required".`,
        );
      }
    }

    if (confidence === 'advisory') {
      // Advisory items should NOT use statutory/definitive language
      const statutoryMatch = containsKeyword(sentence, STATUTORY_KEYWORDS);
      if (statutoryMatch) {
        issues.push(
          `Advisory item "${description}" uses definitive language ("${statutoryMatch}"). ` +
            `Advisory items should use suggestive language like "consider", "may want to".`,
        );
      }
    }

    if (confidence === 'interpretive') {
      // Interpretive items should NOT use strong statutory language
      const statutoryMatch = containsKeyword(sentence, STATUTORY_KEYWORDS);
      if (statutoryMatch) {
        // Only flag the most definitive patterns for interpretive items
        const strongStatutory = ['must', 'shall', 'is required', 'are required', 'mandatory'];
        const strongMatch = containsKeyword(sentence, strongStatutory);
        if (strongMatch) {
          issues.push(
            `Interpretive item "${description}" uses overly definitive language ("${strongMatch}"). ` +
              `Interpretive items should use hedged language like "likely", "generally", "typically".`,
          );
        }
      }
    }
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}
