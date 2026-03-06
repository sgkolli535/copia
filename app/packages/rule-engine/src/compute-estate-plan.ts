import type {
  UserProfile,
  CountryCode,
  Jurisdiction,
  FilingObligation,
  PlanResult,
  ConfidenceTier,
  SourceCitation,
} from '@copia/types';

import { validateProfile } from './validators/profile-validator.js';
import {
  loadProfileJurisdictions,
  loadExchangeRates,
} from './data/registry.js';
import { buildExchangeRateMap } from './calculators/currency.js';

// Pipeline steps
import { determineResidency } from './pipeline/01-residency.js';
import { identifyTreaties } from './pipeline/02-treaties.js';
import { resolveTieBreakers } from './pipeline/03-tie-breaker.js';
import { calculateDomesticLiabilities } from './pipeline/04-domestic.js';
import { applyTreatyRelief } from './pipeline/05-relief.js';
import { detectTrilateralGaps } from './pipeline/06-trilateral.js';
import { consolidateResult } from './pipeline/07-consolidate.js';

// -----------------------------------------------------------------------
// Filing obligation helpers
// -----------------------------------------------------------------------

function makeCitation(
  jurisdiction: CountryCode,
  title: string,
  reference: string,
  confidence: ConfidenceTier,
): SourceCitation {
  return {
    id: `cit-filing-${jurisdiction}-${reference.replace(/[^a-zA-Z0-9]/g, '')}`,
    sourceType: 'statute',
    title,
    reference,
    url: null,
    confidence,
    asOfDate: new Date().toISOString().slice(0, 10),
    jurisdiction,
  };
}

/**
 * Derive filing obligations from the jurisdiction data and residency
 * determinations.
 */
function deriveFilingObligations(
  jurisdictions: Map<CountryCode, Jurisdiction>,
  residencyDeterminations: { personId: string; jurisdiction: CountryCode; isResident: boolean; residencyCategory: string }[],
): FilingObligation[] {
  const obligations: FilingObligation[] = [];

  for (const det of residencyDeterminations) {
    const jurisdiction = jurisdictions.get(det.jurisdiction);
    if (!jurisdiction) continue;

    if (!det.isResident && det.residencyCategory !== 'us-nonresident-alien') continue;

    for (const jObligation of jurisdiction.filingObligations) {
      const alreadyAdded = obligations.some(
        (o) =>
          o.jurisdiction === det.jurisdiction &&
          o.name === jObligation.name,
      );
      if (alreadyAdded) continue;

      obligations.push({
        jurisdiction: det.jurisdiction,
        name: jObligation.name,
        description: jObligation.description,
        deadline: jObligation.deadline,
        penalty: jObligation.penalty,
        confidence: 'statutory',
        citations: [
          makeCitation(
            det.jurisdiction,
            jObligation.name,
            jObligation.source,
            'statutory',
          ),
        ],
      });
    }
  }

  // US citizens always have FBAR/FATCA obligations with foreign assets.
  const hasUSCitizen = residencyDeterminations.some(
    (d) => d.residencyCategory === 'us-citizen',
  );
  if (hasUSCitizen) {
    const usJurisdiction = jurisdictions.get('US');
    if (usJurisdiction) {
      for (const ob of usJurisdiction.filingObligations) {
        const alreadyAdded = obligations.some(
          (o) => o.jurisdiction === 'US' && o.name === ob.name,
        );
        if (!alreadyAdded) {
          obligations.push({
            jurisdiction: 'US',
            name: ob.name,
            description: ob.description,
            deadline: ob.deadline,
            penalty: ob.penalty,
            confidence: 'statutory',
            citations: [
              makeCitation('US', ob.name, ob.source, 'statutory'),
            ],
          });
        }
      }
    }
  }

  return obligations;
}

// -----------------------------------------------------------------------
// Main entry point
// -----------------------------------------------------------------------

/**
 * Compute a complete cross-border estate plan for a given user profile.
 *
 * This is the main entry point of the rule engine. It orchestrates the
 * full 7-step pipeline:
 *   1. Validates the profile
 *   2. Loads jurisdiction data and exchange rates
 *   3. Step 01 -- Residency determination
 *   4. Step 02 -- Treaty identification
 *   5. Step 03 -- Tie-breaker resolution
 *   6. Step 04 -- Domestic liability calculation
 *   7. Step 05 -- Treaty relief application
 *   8. Step 06 -- Trilateral gap detection
 *   9. Step 07 -- Consolidation into PlanResult
 *
 * The function is async because exchange rate loading may hit external
 * APIs, but all pipeline steps are pure and synchronous.
 */
export async function computeEstatePlan(
  profile: UserProfile,
): Promise<PlanResult> {
  // ------ Step 0: Validation ------
  const validation = validateProfile(profile);
  if (!validation.valid) {
    throw new Error(
      `Profile validation failed:\n${validation.errors.map((e) => `  - ${e.field}: ${e.message}`).join('\n')}`,
    );
  }

  // ------ Load data ------
  const { jurisdictions, warnings: jurisdictionWarnings } = loadProfileJurisdictions(profile);
  const exchangeRateSnapshots = await loadExchangeRates(profile);
  const exchangeRateMap = buildExchangeRateMap(exchangeRateSnapshots);

  // ------ Step 1: Residency Determination ------
  const { determinations, auditEntry: residencyAudit } = determineResidency(
    profile,
    [...jurisdictions.values()],
  );

  // ------ Step 2: Treaty Identification ------
  const { treaties, auditEntry: treatyAudit } = identifyTreaties(
    determinations,
    profile,
  );

  // ------ Step 3: Tie-Breaker Resolution ------
  const { results: tieBreakerResults, auditEntry: tieBreakerAudit } =
    resolveTieBreakers(determinations, treaties, profile);

  // ------ Step 4: Domestic Liability Calculation ------
  const { liabilities, auditEntry: domesticAudit } =
    calculateDomesticLiabilities(
      profile,
      determinations,
      jurisdictions,
      exchangeRateMap,
    );

  // ------ Step 5: Treaty Relief Application ------
  const {
    adjustedLiabilities,
    treatyApplications,
    auditEntry: reliefAudit,
  } = applyTreatyRelief(liabilities, treaties, determinations, tieBreakerResults);

  // ------ Step 6: Trilateral Gap Detection ------
  const {
    conflicts,
    auditEntry: trilateralAudit,
  } = detectTrilateralGaps(adjustedLiabilities, treaties, profile);

  // ------ Derive filing obligations from residency determinations ------
  const filingObligations = deriveFilingObligations(
    jurisdictions,
    determinations,
  );

  // ------ Step 7: Consolidate ------
  const allAuditEntries = [
    residencyAudit,
    treatyAudit,
    tieBreakerAudit,
    domesticAudit,
    reliefAudit,
    trilateralAudit,
  ];

  const planResult = consolidateResult(
    profile.id,
    adjustedLiabilities,
    conflicts,
    treatyApplications,
    filingObligations,
    allAuditEntries,
    exchangeRateSnapshots,
    profile.reportingCurrency,
    exchangeRateMap,
    jurisdictionWarnings,
  );

  return planResult;
}
