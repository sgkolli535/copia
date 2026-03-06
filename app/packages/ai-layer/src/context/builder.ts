import type {
  UserProfile,
  Jurisdiction,
  TreatyEdge,
  ScenarioModification,
  AssetClass,
} from '@copia/types';

/**
 * Approximate token count for a string.
 * Uses a rough heuristic of ~4 characters per token (common for English text).
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncate a string to approximately fit within a token budget.
 */
function truncateToTokenBudget(text: string, tokenBudget: number): string {
  const charBudget = tokenBudget * 4;
  if (text.length <= charBudget) return text;
  return text.slice(0, charBudget - 3) + '...';
}

/**
 * Get all unique asset classes present in the user's profile.
 */
function getProfileAssetClasses(profile: UserProfile): Set<AssetClass> {
  const classes = new Set<AssetClass>();
  for (const asset of profile.assets) {
    classes.add(asset.assetClass);
  }
  return classes;
}

/**
 * Get all unique country codes present in the user's profile
 * (from residencies, citizenships, and asset locations).
 */
function getProfileCountries(profile: UserProfile): Set<string> {
  const countries = new Set<string>();

  for (const r of profile.residencies) {
    countries.add(r.country);
  }
  for (const c of profile.citizenships) {
    countries.add(c);
  }
  for (const a of profile.assets) {
    countries.add(a.spikeLocation);
  }
  for (const fm of profile.family) {
    for (const c of fm.citizenships) {
      countries.add(c);
    }
    if (fm.residency) {
      countries.add(fm.residency.country);
    }
  }

  return countries;
}

/**
 * Filter rules to only those relevant to the profile's asset classes
 * and jurisdictions. This prunes irrelevant rules to save token budget.
 */
function pruneRules(rules: Jurisdiction[], profile: UserProfile): Jurisdiction[] {
  const profileCountries = getProfileCountries(profile);
  const profileAssetClasses = getProfileAssetClasses(profile);

  // Only include jurisdictions that are relevant to the profile
  return rules.filter((j) => profileCountries.has(j.code)).map((j) => {
    // Keep all estate/gift/CGT rules for relevant jurisdictions,
    // but prune special rules that target asset classes the profile doesn't have
    const prunedEstateTax = {
      ...j.estateTax,
      specialRules: j.estateTax.specialRules.filter((sr) => {
        // Keep if no specific asset class targeting, or if it targets a class the profile has
        const triggerLower = sr.trigger.toLowerCase();
        const hasMatchingClass = Array.from(profileAssetClasses).some((ac) =>
          triggerLower.includes(ac.replace(/_/g, ' ')),
        );
        // If the trigger doesn't mention any asset class, keep it (general rule)
        const mentionsAnyClass = [
          'immovable',
          'business',
          'shares',
          'bonds',
          'bank',
          'personal',
          'pension',
          'insurance',
        ].some((keyword) => triggerLower.includes(keyword));

        return !mentionsAnyClass || hasMatchingClass;
      }),
    };

    return {
      ...j,
      estateTax: prunedEstateTax,
    };
  });
}

/**
 * Filter treaties to only those relevant to the profile's jurisdictions.
 */
function pruneTreaties(treaties: TreatyEdge[], profile: UserProfile): TreatyEdge[] {
  const profileCountries = getProfileCountries(profile);

  return treaties.filter(
    (t) => profileCountries.has(t.countries[0]) && profileCountries.has(t.countries[1]),
  );
}

/**
 * Format the system prompt section.
 */
function buildSystemSection(): string {
  return `You are Copia, a cross-border estate and tax planning assistant. You help users understand their multi-jurisdictional tax exposure for estate planning, gifting, and capital gains.

IMPORTANT CONSTRAINTS:
- You are an educational tool, NOT a legal or tax advisor.
- All outputs are informational and should not be construed as professional advice.
- Always recommend consulting qualified professionals for implementation.
- Never encourage tax evasion or illegal structures.
- Always disclose confidence levels (statutory / interpretive / advisory).
- Only cite figures that come from the computed plan data.`;
}

/**
 * Format the user profile section.
 */
function buildProfileSection(profile: UserProfile, tokenBudget: number): string {
  const profileData = {
    name: profile.name,
    age: profile.age,
    citizenships: profile.citizenships,
    residencies: profile.residencies.map((r) => ({
      country: r.country,
      daysPresent: r.daysPresent,
      isDomiciled: r.isDomiciled,
      yearsResident: r.yearsResident,
    })),
    assets: profile.assets.map((a) => ({
      id: a.id,
      name: a.name,
      assetClass: a.assetClass,
      location: a.spikeLocation,
      value: a.value,
      currency: a.currency,
      ownershipType: a.ownershipType,
      ownershipFraction: a.ownershipFraction,
    })),
    family: profile.family.map((f) => ({
      id: f.id,
      name: f.name,
      relationship: f.relationship,
      citizenships: f.citizenships,
      isBeneficiary: f.isBeneficiary,
      age: f.age,
    })),
    reportingCurrency: profile.reportingCurrency,
  };

  const raw = `## User Profile\n${JSON.stringify(profileData, null, 2)}`;
  return truncateToTokenBudget(raw, tokenBudget);
}

/**
 * Format the applicable rules section.
 */
function buildRulesSection(rules: Jurisdiction[], tokenBudget: number): string {
  if (rules.length === 0) return '## Applicable Tax Rules\nNo applicable rules found.';

  const sections = rules.map((j) => {
    const parts = [`### ${j.name} (${j.code})`];

    if (j.estateTax.exists) {
      parts.push(`Estate Tax: ${j.estateTax.taxBase}-based`);
      parts.push(
        `  Brackets: ${j.estateTax.brackets.map((b) => `${b.from}-${b.to ?? 'above'}: ${(b.rate * 100).toFixed(1)}%`).join(', ')}`,
      );
      if (j.estateTax.exemptions.length > 0) {
        parts.push(
          `  Exemptions: ${j.estateTax.exemptions.map((e) => `${e.name}: ${e.amount} ${j.currency}`).join(', ')}`,
        );
      }
      if (j.estateTax.spousalProvisions.length > 0) {
        parts.push(
          `  Spousal: ${j.estateTax.spousalProvisions.map((s) => s.name).join(', ')}`,
        );
      }
    } else {
      parts.push('Estate Tax: None');
    }

    if (j.giftTax.exists) {
      parts.push(
        `Gift Tax: Annual excl. ${j.giftTax.annualExclusion} ${j.currency}, Lifetime: ${j.giftTax.lifetimeExemption ?? 'N/A'}`,
      );
    }

    if (j.capitalGainsTax.exists) {
      parts.push(`Capital Gains Tax: Exists (holding period: ${j.capitalGainsTax.holdingPeriodMonths} months)`);
    }

    if (j.sunsetProvisions.length > 0) {
      parts.push(
        `Sunset Provisions: ${j.sunsetProvisions.map((s) => `${s.name} (${s.effectiveDate}): ${s.impact}`).join('; ')}`,
      );
    }

    parts.push(`Residency Tests: ${j.residencyRules.map((r) => r.testType).join(', ')}`);

    return parts.join('\n');
  });

  const raw = `## Applicable Tax Rules\n${sections.join('\n\n')}`;
  return truncateToTokenBudget(raw, tokenBudget);
}

/**
 * Format the treaty section.
 */
function buildTreatySection(treaties: TreatyEdge[], tokenBudget: number): string {
  if (treaties.length === 0) return '## Applicable Treaties\nNo applicable treaties found.';

  const sections = treaties.map((t) => {
    const rights = t.taxingRights
      .map((tr) => `${tr.assetClass}: ${tr.right} (Art. ${tr.articleRef})`)
      .join(', ');
    return `### ${t.treatyName} (${t.pair})\nRelief: ${t.reliefMethod} | MLI: ${t.mliApplies ? 'Yes' : 'No'}\nTaxing Rights: ${rights}${t.gaps.length > 0 ? `\nGaps: ${t.gaps.map((g) => `${g.description} [${g.riskLevel}]`).join('; ')}` : ''}`;
  });

  const raw = `## Applicable Treaties\n${sections.join('\n\n')}`;
  return truncateToTokenBudget(raw, tokenBudget);
}

/**
 * Format the scenario stack section.
 */
function buildScenarioSection(
  scenarioStack: ScenarioModification[],
  tokenBudget: number,
): string {
  if (scenarioStack.length === 0) return '## Scenario Stack\nNo active scenarios (baseline).';

  const scenarios = scenarioStack.map(
    (s, i) => `${i + 1}. [${s.type}] ${s.description} (ID: ${s.id})`,
  );

  const raw = `## Scenario Stack\n${scenarios.join('\n')}`;
  return truncateToTokenBudget(raw, tokenBudget);
}

/**
 * Format the negative context section (things the system should NOT do).
 */
function buildNegativeContext(): string {
  return `## Negative Context (DO NOT)
- Do NOT provide specific legal advice or recommend specific actions as definitive.
- Do NOT fabricate or estimate numbers not present in the computed data.
- Do NOT assume facts not provided by the user.
- Do NOT discuss jurisdictions not relevant to this profile.
- Do NOT use definitive language for advisory-tier items.
- Do NOT use hedging language for statutory-tier items.
- Do NOT suggest illegal tax avoidance strategies.`;
}

// ----- Main Function -----

/**
 * Assemble the full context string for LLM prompts, respecting token budgets.
 *
 * Budget allocation (approximate, based on ~128k token context window):
 * - System prompt: 8%  (~10,240 tokens)
 * - User profile: 10%  (~12,800 tokens)
 * - Applicable rules: 25% (~32,000 tokens)
 * - Treaties: included within rules budget
 * - Scenario stack: 10% (~12,800 tokens)
 * - Conversation summary: 5% (~6,400 tokens)
 * - Negative context: 2% (~2,560 tokens)
 *
 * Rules are pruned to exclude those irrelevant to the profile's actual
 * asset classes and jurisdictions.
 */
export function buildContext(params: {
  profile: UserProfile;
  rules: Jurisdiction[];
  treaties: TreatyEdge[];
  scenarioStack: ScenarioModification[];
  conversationSummary: string;
}): string {
  const { profile, rules, treaties, scenarioStack, conversationSummary } = params;

  // Assume a ~128k token context window; these budgets are in tokens
  const TOTAL_BUDGET = 128_000;

  const systemBudget = Math.floor(TOTAL_BUDGET * 0.08); // 10,240
  const profileBudget = Math.floor(TOTAL_BUDGET * 0.10); // 12,800
  const rulesBudget = Math.floor(TOTAL_BUDGET * 0.20); // 25,600
  const treatyBudget = Math.floor(TOTAL_BUDGET * 0.05); // 6,400
  const scenarioBudget = Math.floor(TOTAL_BUDGET * 0.10); // 12,800
  const conversationBudget = Math.floor(TOTAL_BUDGET * 0.05); // 6,400
  const negativeBudget = Math.floor(TOTAL_BUDGET * 0.02); // 2,560

  // Prune rules and treaties to only relevant ones
  const prunedRules = pruneRules(rules, profile);
  const prunedTreaties = pruneTreaties(treaties, profile);

  // Build each section
  const systemSection = truncateToTokenBudget(buildSystemSection(), systemBudget);
  const profileSection = buildProfileSection(profile, profileBudget);
  const rulesSection = buildRulesSection(prunedRules, rulesBudget);
  const treatySection = buildTreatySection(prunedTreaties, treatyBudget);
  const scenarioSection = buildScenarioSection(scenarioStack, scenarioBudget);
  const conversationSection = truncateToTokenBudget(
    conversationSummary
      ? `## Conversation Summary\n${conversationSummary}`
      : '## Conversation Summary\nNew session.',
    conversationBudget,
  );
  const negativeSection = truncateToTokenBudget(buildNegativeContext(), negativeBudget);

  // Assemble the full context
  const sections = [
    systemSection,
    profileSection,
    rulesSection,
    treatySection,
    scenarioSection,
    conversationSection,
    negativeSection,
  ];

  return sections.join('\n\n---\n\n');
}
