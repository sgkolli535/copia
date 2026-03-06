import type {
  UserProfile,
  CountryCode,
  ConfidenceTier,
  SourceCitation,
} from '@copia/types';
import type { AuditEntry } from '@copia/types';
import type { ResidencyDetermination } from './01-residency.js';
import type { ApplicableTreaty } from './02-treaties.js';

const ENGINE_VERSION = '1.0.0';

// -----------------------------------------------------------------------
// Public interface
// -----------------------------------------------------------------------

export interface TieBreakerResult {
  personId: string;
  jurisdictions: [CountryCode, CountryCode];
  resolvedResidence: CountryCode | null;
  appliedRule: string;
  confidence: ConfidenceTier;
  citations: SourceCitation[];
}

// -----------------------------------------------------------------------
// Tie-breaker cascade helpers
// -----------------------------------------------------------------------

/**
 * Evaluate the treaty tie-breaker cascade for a pair of jurisdictions
 * and a person.
 *
 * The OECD Model Tax Convention Art 4(2) tie-breaker hierarchy:
 *   1. Permanent home
 *   2. Centre of vital interests
 *   3. Habitual abode
 *   4. Nationality
 *   5. Mutual agreement
 *
 * Because the engine cannot know facts like "centre of vital interests"
 * with certainty from profile data alone, we apply heuristics and set
 * confidence accordingly.
 */
function applyTieBreakerCascade(
  personId: string,
  profile: UserProfile,
  c1: CountryCode,
  c2: CountryCode,
  c1Det: ResidencyDetermination,
  c2Det: ResidencyDetermination,
  treaty: ApplicableTreaty,
): TieBreakerResult {
  const person = personId === profile.id
    ? profile
    : profile.family.find((m) => m.id === personId);

  if (!person) {
    return {
      personId,
      jurisdictions: [c1, c2],
      resolvedResidence: null,
      appliedRule: 'Person not found in profile; cannot apply tie-breaker.',
      confidence: 'advisory',
      citations: [],
    };
  }

  const tieBreakerRules = treaty.treaty.tieBreakerRules;
  if (tieBreakerRules.length === 0) {
    return {
      personId,
      jurisdictions: [c1, c2],
      resolvedResidence: null,
      appliedRule: 'No tie-breaker rules available in the treaty.',
      confidence: 'advisory',
      citations: [],
    };
  }

  const residencies = 'residencies' in person ? person.residencies : (person.residency ? [person.residency] : []);
  const c1Res = residencies.find((r) => r.country === c1);
  const c2Res = residencies.find((r) => r.country === c2);

  // ------- Step 1: Permanent home -------
  // Heuristic: a person has a permanent home where they own immovable property
  // or are domiciled.
  const hasPropertyIn = (code: CountryCode): boolean =>
    profile.assets.some(
      (a) =>
        a.spikeLocation === code &&
        a.assetClass === 'immovable_property',
    );

  const c1Home = (c1Res?.isDomiciled ?? false) || hasPropertyIn(c1);
  const c2Home = (c2Res?.isDomiciled ?? false) || hasPropertyIn(c2);

  if (c1Home && !c2Home) {
    return makeResult(personId, c1, c2, c1, 'permanent_home',
      `Permanent home in ${c1} (property or domicile); no permanent home in ${c2}.`,
      'interpretive', tieBreakerRules);
  }
  if (c2Home && !c1Home) {
    return makeResult(personId, c1, c2, c2, 'permanent_home',
      `Permanent home in ${c2} (property or domicile); no permanent home in ${c1}.`,
      'interpretive', tieBreakerRules);
  }

  // Permanent home in both or neither -- move to step 2

  // ------- Step 2: Centre of vital interests -------
  // Heuristic: country with more days present and higher asset value
  const c1Days = c1Res?.daysPresent ?? 0;
  const c2Days = c2Res?.daysPresent ?? 0;

  const assetValueIn = (code: CountryCode): number =>
    profile.assets
      .filter((a) => a.spikeLocation === code)
      .reduce((sum, a) => sum + a.value * a.ownershipFraction, 0);

  const c1AssetVal = assetValueIn(c1);
  const c2AssetVal = assetValueIn(c2);

  // If there is a clear "tilt" in both time and economic ties
  if (c1Days > c2Days && c1AssetVal > c2AssetVal) {
    return makeResult(personId, c1, c2, c1, 'center_of_vital_interests',
      `Centre of vital interests in ${c1}: more days present (${c1Days} vs ${c2Days}) and higher asset value in ${c1}.`,
      'interpretive', tieBreakerRules);
  }
  if (c2Days > c1Days && c2AssetVal > c1AssetVal) {
    return makeResult(personId, c1, c2, c2, 'center_of_vital_interests',
      `Centre of vital interests in ${c2}: more days present (${c2Days} vs ${c1Days}) and higher asset value in ${c2}.`,
      'interpretive', tieBreakerRules);
  }

  // ------- Step 3: Habitual abode -------
  // Heuristic: the country where the person spends more days
  if (c1Days > c2Days) {
    return makeResult(personId, c1, c2, c1, 'habitual_abode',
      `Habitual abode in ${c1}: ${c1Days} days vs ${c2Days} days in ${c2}.`,
      'interpretive', tieBreakerRules);
  }
  if (c2Days > c1Days) {
    return makeResult(personId, c1, c2, c2, 'habitual_abode',
      `Habitual abode in ${c2}: ${c2Days} days vs ${c1Days} days in ${c1}.`,
      'interpretive', tieBreakerRules);
  }

  // ------- Step 4: Nationality -------
  const citizenships = 'citizenships' in person ? person.citizenships : [];
  const c1National = citizenships.includes(c1);
  const c2National = citizenships.includes(c2);

  if (c1National && !c2National) {
    return makeResult(personId, c1, c2, c1, 'nationality',
      `National of ${c1} but not ${c2}; tie-breaker resolved by nationality.`,
      'statutory', tieBreakerRules);
  }
  if (c2National && !c1National) {
    return makeResult(personId, c1, c2, c2, 'nationality',
      `National of ${c2} but not ${c1}; tie-breaker resolved by nationality.`,
      'statutory', tieBreakerRules);
  }

  // ------- Step 5: Mutual agreement (unresolved) -------
  return {
    personId,
    jurisdictions: [c1, c2],
    resolvedResidence: null,
    appliedRule: `Tie-breaker cascade exhausted without resolution between ${c1} and ${c2}. Competent authority mutual agreement required.`,
    confidence: 'advisory',
    citations: tieBreakerRules.map((r) => ({
      id: `cit-tiebreaker-${r.test}`,
      sourceType: 'treaty' as const,
      title: `Tie-breaker: ${r.test}`,
      reference: r.articleRef,
      url: null,
      confidence: 'statutory' as const,
      asOfDate: new Date().toISOString().slice(0, 10),
      jurisdiction: treaty.treaty.pair,
    })),
  };
}

function makeResult(
  personId: string,
  c1: CountryCode,
  c2: CountryCode,
  resolved: CountryCode,
  ruleTest: string,
  explanation: string,
  confidence: ConfidenceTier,
  tieBreakerRules: { test: string; articleRef: string }[],
): TieBreakerResult {
  const matchingRule = tieBreakerRules.find((r) => r.test === ruleTest);
  return {
    personId,
    jurisdictions: [c1, c2],
    resolvedResidence: resolved,
    appliedRule: explanation,
    confidence,
    citations: matchingRule
      ? [
          {
            id: `cit-tiebreaker-${ruleTest}`,
            sourceType: 'treaty',
            title: `Tie-breaker rule: ${ruleTest}`,
            reference: matchingRule.articleRef,
            url: null,
            confidence: 'statutory',
            asOfDate: new Date().toISOString().slice(0, 10),
            jurisdiction: `${c1}-${c2}`,
          },
        ]
      : [],
  };
}

// -----------------------------------------------------------------------
// Main exported function
// -----------------------------------------------------------------------

/**
 * Resolve dual-residency cases using treaty tie-breaker rules.
 *
 * For each person who is determined to be tax-resident in two or more
 * jurisdictions, and where a treaty with tie-breaker rules exists, we
 * apply the tie-breaker cascade.
 *
 * NOTE: The US saving clause means the US always taxes its citizens
 * regardless of the tie-breaker outcome. We surface this but still
 * resolve the treaty tie-breaker for credit/relief purposes.
 */
export function resolveTieBreakers(
  determinations: ResidencyDetermination[],
  treaties: ApplicableTreaty[],
  profile: UserProfile,
): { results: TieBreakerResult[]; auditEntry: AuditEntry } {
  const results: TieBreakerResult[] = [];

  // Group determinations by person
  const byPerson = new Map<string, ResidencyDetermination[]>();
  for (const det of determinations) {
    let list = byPerson.get(det.personId);
    if (!list) {
      list = [];
      byPerson.set(det.personId, list);
    }
    list.push(det);
  }

  for (const [personId, personDets] of byPerson.entries()) {
    // Find jurisdictions where this person is considered resident
    const residentJurisdictions = personDets
      .filter((d) => d.isResident)
      .map((d) => d.jurisdiction);

    if (residentJurisdictions.length < 2) continue;

    // Check every pair of resident jurisdictions
    for (let i = 0; i < residentJurisdictions.length; i++) {
      for (let j = i + 1; j < residentJurisdictions.length; j++) {
        const c1 = residentJurisdictions[i];
        const c2 = residentJurisdictions[j];

        // Find the applicable treaty for this pair
        const pairKey = [c1, c2].sort().join('-');
        const applicableTreaty = treaties.find(
          (at) => at.treaty.pair === pairKey,
        );

        if (!applicableTreaty) {
          // No treaty: dual taxation without relief
          results.push({
            personId,
            jurisdictions: [c1, c2],
            resolvedResidence: null,
            appliedRule: `No applicable treaty between ${c1} and ${c2}. Both jurisdictions may assert full taxing rights.`,
            confidence: 'advisory',
            citations: [],
          });
          continue;
        }

        const c1Det = personDets.find((d) => d.jurisdiction === c1)!;
        const c2Det = personDets.find((d) => d.jurisdiction === c2)!;

        const result = applyTieBreakerCascade(
          personId, profile, c1, c2, c1Det, c2Det, applicableTreaty,
        );

        // Note: US saving clause -- if one of the jurisdictions is US and
        // the person is a US citizen, flag it.
        const person = personId === profile.id ? profile : profile.family.find((m) => m.id === personId);
        const citizenships = person && 'citizenships' in person ? person.citizenships : [];
        const hasSavingClause =
          (c1 === 'US' || c2 === 'US') &&
          citizenships.includes('US') &&
          applicableTreaty.treaty.specialProvisions.some(
            (sp) => sp.id === 'us-saving-clause',
          );

        if (hasSavingClause) {
          result.appliedRule += ' NOTE: US saving clause applies -- the US retains the right to tax its citizens on worldwide estate regardless of this tie-breaker outcome. Credit for foreign tax is available.';
          result.citations.push({
            id: 'cit-us-saving-clause',
            sourceType: 'treaty',
            title: 'US Saving Clause',
            reference: 'Art 4(4) US-UK Estate Tax Treaty',
            url: null,
            confidence: 'statutory',
            asOfDate: new Date().toISOString().slice(0, 10),
            jurisdiction: 'US',
          });
        }

        results.push(result);
      }
    }
  }

  const auditEntry: AuditEntry = {
    step: '03-tie-breaker',
    timestamp: new Date().toISOString(),
    determination: `Evaluated tie-breaker rules for ${results.length} dual-residency case(s). Resolved ${results.filter((r) => r.resolvedResidence !== null).length}, unresolved ${results.filter((r) => r.resolvedResidence === null).length}.`,
    inputs: {
      dualResidentPersons: [...byPerson.entries()]
        .filter(([, dets]) => dets.filter((d) => d.isResident).length >= 2)
        .map(([id]) => id),
    },
    outputs: {
      results: results.map((r) => ({
        personId: r.personId,
        jurisdictions: r.jurisdictions,
        resolved: r.resolvedResidence,
        rule: r.appliedRule,
      })),
    },
    citations: results.flatMap((r) => r.citations),
    engineVersion: ENGINE_VERSION,
  };

  return { results, auditEntry };
}
