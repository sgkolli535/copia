import type {
  PlanResult,
  ScenarioModification,
  ScenarioDelta,
  LiabilityDelta,
  TradeOff,
  CurrencyCode,
  CountryCode,
  Liability,
} from '@copia/types';

/**
 * Build a canonical key for matching liabilities across plans.
 */
function liabilityKey(jurisdiction: CountryCode, taxType: string): string {
  return `${jurisdiction}:${taxType}`;
}

/**
 * Convert a liability amount to the reporting currency using the plan's
 * exchange rate snapshots. Falls back to 1:1 if no rate is available
 * (same currency or missing data).
 */
function toReportingCurrency(
  amount: number,
  fromCurrency: CurrencyCode,
  plan: PlanResult,
): number {
  if (fromCurrency === plan.reportingCurrency) return amount;

  const snapshot = plan.exchangeRates.find(
    (r) => r.from === fromCurrency && r.to === plan.reportingCurrency,
  );

  if (snapshot) return amount * snapshot.rate;

  // Try inverse
  const inverse = plan.exchangeRates.find(
    (r) => r.from === plan.reportingCurrency && r.to === fromCurrency,
  );

  if (inverse && inverse.rate !== 0) return amount / inverse.rate;

  // No rate found -- return amount as-is (best effort)
  return amount;
}

/**
 * Compare baseline and scenario PlanResults, producing a structured delta.
 *
 * The delta includes:
 * - Per-liability changes matched by jurisdiction + taxType
 * - Net financial impact in reporting currency
 * - New and resolved conflicts
 * - New and removed filing obligations
 * - Trade-off analysis
 */
export function computeDelta(
  baseline: PlanResult,
  scenario: PlanResult,
  modification: ScenarioModification,
): ScenarioDelta {
  // -------------------------------------------------------
  // 1. Compute liability deltas
  // -------------------------------------------------------
  const baselineMap = new Map<string, Liability>();
  for (const liability of baseline.liabilities) {
    const key = liabilityKey(liability.jurisdiction, liability.taxType);
    // If multiple liabilities share the same key, sum them
    const existing = baselineMap.get(key);
    if (existing) {
      baselineMap.set(key, {
        ...existing,
        netAmount: existing.netAmount + liability.netAmount,
        grossAmount: existing.grossAmount + liability.grossAmount,
        reliefAmount: existing.reliefAmount + liability.reliefAmount,
      });
    } else {
      baselineMap.set(key, { ...liability });
    }
  }

  const scenarioMap = new Map<string, Liability>();
  for (const liability of scenario.liabilities) {
    const key = liabilityKey(liability.jurisdiction, liability.taxType);
    const existing = scenarioMap.get(key);
    if (existing) {
      scenarioMap.set(key, {
        ...existing,
        netAmount: existing.netAmount + liability.netAmount,
        grossAmount: existing.grossAmount + liability.grossAmount,
        reliefAmount: existing.reliefAmount + liability.reliefAmount,
      });
    } else {
      scenarioMap.set(key, { ...liability });
    }
  }

  // Collect all liability keys from both plans
  const allKeys = new Set([...baselineMap.keys(), ...scenarioMap.keys()]);
  const liabilityDeltas: LiabilityDelta[] = [];

  for (const key of allKeys) {
    const baselineLiability = baselineMap.get(key);
    const scenarioLiability = scenarioMap.get(key);

    // Parse key back to jurisdiction + taxType
    const [jurisdiction, taxType] = key.split(':') as [CountryCode, string];

    const baselineAmount = baselineLiability
      ? toReportingCurrency(baselineLiability.netAmount, baselineLiability.currency, baseline)
      : 0;

    const scenarioAmount = scenarioLiability
      ? toReportingCurrency(scenarioLiability.netAmount, scenarioLiability.currency, scenario)
      : 0;

    const deltaAmount = scenarioAmount - baselineAmount;
    const deltaPct = baselineAmount !== 0
      ? (deltaAmount / Math.abs(baselineAmount)) * 100
      : scenarioAmount !== 0
        ? 100 // New liability appeared: 100% increase
        : 0;  // Both zero: no change

    liabilityDeltas.push({
      jurisdiction,
      taxType,
      baselineAmount,
      scenarioAmount,
      deltaAmount,
      deltaPct: Math.round(deltaPct * 100) / 100, // round to 2 decimal places
    });
  }

  // -------------------------------------------------------
  // 2. Compute net impact (sum of all deltas in reporting currency)
  //    Negative = savings, Positive = increased cost
  // -------------------------------------------------------
  const netImpact = liabilityDeltas.reduce((sum, d) => sum + d.deltaAmount, 0);

  // -------------------------------------------------------
  // 3. Conflict analysis
  // -------------------------------------------------------
  const baselineConflictIds = new Set(baseline.conflicts.map((c) => c.id));
  const scenarioConflictIds = new Set(scenario.conflicts.map((c) => c.id));

  // Since scenario conflicts get new UUIDs, we match by jurisdiction pair + description
  // to determine truly new vs resolved conflicts.
  const conflictSignature = (jurisdictions: CountryCode[], description: string) =>
    `${[...jurisdictions].sort().join(',')}|${description}`;

  const baselineConflictSigs = new Map<string, string>();
  for (const c of baseline.conflicts) {
    baselineConflictSigs.set(conflictSignature(c.jurisdictions, c.description), c.id);
  }

  const scenarioConflictSigs = new Map<string, string>();
  for (const c of scenario.conflicts) {
    scenarioConflictSigs.set(conflictSignature(c.jurisdictions, c.description), c.id);
  }

  const newConflicts: string[] = [];
  for (const [sig, id] of scenarioConflictSigs) {
    if (!baselineConflictSigs.has(sig)) {
      newConflicts.push(id);
    }
  }

  const resolvedConflicts: string[] = [];
  for (const [sig, id] of baselineConflictSigs) {
    if (!scenarioConflictSigs.has(sig)) {
      resolvedConflicts.push(id);
    }
  }

  // -------------------------------------------------------
  // 4. Filing obligation analysis
  // -------------------------------------------------------
  const obligationKey = (jurisdiction: CountryCode, name: string) => `${jurisdiction}:${name}`;

  const baselineObligations = new Set(
    baseline.filingObligations.map((o) => obligationKey(o.jurisdiction, o.name)),
  );

  const scenarioObligations = new Set(
    scenario.filingObligations.map((o) => obligationKey(o.jurisdiction, o.name)),
  );

  const newObligations: string[] = [];
  for (const key of scenarioObligations) {
    if (!baselineObligations.has(key)) {
      newObligations.push(key);
    }
  }

  const removedObligations: string[] = [];
  for (const key of baselineObligations) {
    if (!scenarioObligations.has(key)) {
      removedObligations.push(key);
    }
  }

  // -------------------------------------------------------
  // 5. Trade-off analysis
  // -------------------------------------------------------
  const tradeOffs: TradeOff[] = [];

  // Trade-off 1: Total liability decreased but new conflicts appeared
  if (netImpact < 0 && newConflicts.length > 0) {
    const newConflictDescriptions = scenario.conflicts
      .filter((c) => newConflicts.includes(c.id))
      .map((c) => c.description);

    tradeOffs.push({
      description: 'Tax savings come with new jurisdictional conflicts',
      pros: [
        `Net tax savings of ${Math.abs(netImpact).toFixed(2)} ${baseline.reportingCurrency}`,
      ],
      cons: [
        `${newConflicts.length} new conflict(s) introduced`,
        ...newConflictDescriptions.map((d) => `New conflict: ${d}`),
      ],
      financialImpact: netImpact,
    });
  }

  // Trade-off 2: Jurisdictional shift -- one jurisdiction's liability went down,
  //              another went up
  const jurisdictionsWithDecrease = liabilityDeltas.filter((d) => d.deltaAmount < 0);
  const jurisdictionsWithIncrease = liabilityDeltas.filter((d) => d.deltaAmount > 0);

  if (jurisdictionsWithDecrease.length > 0 && jurisdictionsWithIncrease.length > 0) {
    const decreasePros = jurisdictionsWithDecrease.map(
      (d) => `${d.jurisdiction} ${d.taxType}: saves ${Math.abs(d.deltaAmount).toFixed(2)} (${Math.abs(d.deltaPct).toFixed(1)}% reduction)`,
    );
    const increaseCons = jurisdictionsWithIncrease.map(
      (d) => `${d.jurisdiction} ${d.taxType}: increases by ${d.deltaAmount.toFixed(2)} (${d.deltaPct.toFixed(1)}% increase)`,
    );

    tradeOffs.push({
      description: 'Liability shifts between jurisdictions',
      pros: decreasePros,
      cons: increaseCons,
      financialImpact: netImpact,
    });
  }

  // Trade-off 3: Obligations increased but liability decreased
  if (netImpact < 0 && newObligations.length > 0 && removedObligations.length < newObligations.length) {
    tradeOffs.push({
      description: 'Tax savings come with additional filing obligations',
      pros: [
        `Net tax savings of ${Math.abs(netImpact).toFixed(2)} ${baseline.reportingCurrency}`,
        ...(removedObligations.length > 0
          ? [`${removedObligations.length} obligation(s) removed`]
          : []),
      ],
      cons: [
        `${newObligations.length} new filing obligation(s)`,
        ...newObligations.map((o) => `New obligation: ${o}`),
      ],
      financialImpact: netImpact,
    });
  }

  // Trade-off 4: Total liability increased but conflicts were resolved
  if (netImpact > 0 && resolvedConflicts.length > 0) {
    const resolvedDescriptions = baseline.conflicts
      .filter((c) => resolvedConflicts.includes(c.id))
      .map((c) => c.description);

    tradeOffs.push({
      description: 'Resolving conflicts comes at a cost',
      pros: [
        `${resolvedConflicts.length} conflict(s) resolved`,
        ...resolvedDescriptions.map((d) => `Resolved: ${d}`),
      ],
      cons: [
        `Net cost increase of ${netImpact.toFixed(2)} ${baseline.reportingCurrency}`,
      ],
      financialImpact: netImpact,
    });
  }

  // Trade-off 5: Liability decreased and obligations also decreased (pure win)
  // Not really a trade-off, but useful to highlight
  if (netImpact < 0 && removedObligations.length > 0 && newObligations.length === 0 && newConflicts.length === 0) {
    tradeOffs.push({
      description: 'Net improvement with no downsides',
      pros: [
        `Net tax savings of ${Math.abs(netImpact).toFixed(2)} ${baseline.reportingCurrency}`,
        `${removedObligations.length} filing obligation(s) eliminated`,
        ...(resolvedConflicts.length > 0 ? [`${resolvedConflicts.length} conflict(s) resolved`] : []),
      ],
      cons: [],
      financialImpact: netImpact,
    });
  }

  // -------------------------------------------------------
  // 6. Assemble final delta
  // -------------------------------------------------------
  return {
    id: crypto.randomUUID(),
    modification,
    baselinePlanId: baseline.id,
    scenarioPlanId: scenario.id,
    liabilityDeltas,
    netImpact,
    newConflicts,
    resolvedConflicts,
    newObligations,
    removedObligations,
    tradeOffs,
    computedAt: new Date().toISOString(),
  };
}
