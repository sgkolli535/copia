import React, { useState, useCallback } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Link } from 'react-router-dom';
import type { ScenarioDelta, ScenarioModification, LiabilityDelta, TradeOff } from '@copia/types';
import { planAtom, profileAtom, scenariosAtom, loadingAtom, errorAtom } from '../store/atoms';
import { api } from '../api/client';
import { emitEvent } from '../store/analytics';
import Button from '../components/Button';
import DeltaCard from '../components/DeltaCard';
import CalloutBox from '../components/CalloutBox';

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  IN: 'India',
  PT: 'Portugal',
};

function formatCurrency(amount: number, currency: string): string {
  const locale = currency === 'GBP' ? 'en-GB' : currency === 'INR' ? 'en-IN' : currency === 'EUR' ? 'de-DE' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ---- Predefined Scenarios ----

interface PredefinedScenario {
  label: string;
  description: string;
  modification: ScenarioModification;
}

function getPredefinedScenarios(profileId: string): PredefinedScenario[] {
  return [
    {
      label: 'Relocate to Portugal',
      description: 'What if Marcus relocates from the UK to Portugal (NHR regime)?',
      modification: {
        id: crypto.randomUUID(),
        type: 'relocate',
        description: 'Relocate primary residence from UK to Portugal to leverage NHR tax regime',
        params: {
          type: 'relocate',
          personId: profileId,
          toCountry: 'PT',
          daysPresent: 280,
          year: 2025,
        },
      },
    },
    {
      label: 'Gift shares to spouse',
      description: 'What if Marcus gifts 50% of the US brokerage to Priya?',
      modification: {
        id: crypto.randomUUID(),
        type: 'gift_asset',
        description: 'Gift 50% of US brokerage account shares to spouse Priya',
        params: {
          type: 'gift_asset',
          assetId: '', // will be filled from profile
          recipientId: '', // will be filled from profile
          fraction: 0.5,
        },
      },
    },
    {
      label: 'QDOT for non-citizen spouse',
      description: 'What if assets are placed in a Qualified Domestic Trust (QDOT)?',
      modification: {
        id: crypto.randomUUID(),
        type: 'spousal_planning',
        description: 'Structure assets in a QDOT for non-citizen spouse Priya to defer estate tax',
        params: {
          type: 'spousal_planning',
          strategy: 'qdot',
          assetIds: [], // will be filled from profile
        },
      },
    },
  ];
}

// ---- Activity Log ----

interface ActivityStep {
  id: string;
  timestamp: string;
  message: string;
  status: 'pending' | 'running' | 'complete' | 'error';
}

export default function ScenarioExplorer() {
  const plan = useAtomValue(planAtom);
  const profile = useAtomValue(profileAtom);
  const [scenarios, setScenarios] = useAtom(scenariosAtom);
  const setLoading = useSetAtom(loadingAtom);
  const setError = useSetAtom(errorAtom);

  const [nlInput, setNlInput] = useState('');
  const [activityLog, setActivityLog] = useState<ActivityStep[]>([]);
  const [currentDelta, setCurrentDelta] = useState<ScenarioDelta | null>(null);
  const [processing, setProcessing] = useState(false);

  const addActivity = useCallback((message: string, status: ActivityStep['status'] = 'running') => {
    const step: ActivityStep = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      message,
      status,
    };
    setActivityLog((prev) => [...prev, step]);
    return step.id;
  }, []);

  const updateActivity = useCallback((id: string, status: ActivityStep['status']) => {
    setActivityLog((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s)),
    );
  }, []);

  const runScenario = useCallback(
    async (modification: ScenarioModification) => {
      if (!profile || !plan) return;

      setProcessing(true);
      setLoading(true);
      setError(null);
      setActivityLog([]);
      setCurrentDelta(null);

      try {
        // Step 1: Parse modification
        const step1Id = addActivity('Parsing scenario modification...');
        await new Promise((r) => setTimeout(r, 300));
        updateActivity(step1Id, 'complete');

        // Step 2: Apply modification to profile
        const step2Id = addActivity('Applying modification to profile clone...');
        // In prototype, we directly modify and recompute
        // A real implementation would use applyModification + computeDelta from rule-engine
        const modifiedProfile = structuredClone(profile);
        modifiedProfile.updatedAt = new Date().toISOString();

        // Apply simple modifications based on type
        if (modification.params.type === 'relocate') {
          const params = modification.params;
          const existingIdx = modifiedProfile.residencies.findIndex(
            (r) => r.country === params.toCountry,
          );
          if (existingIdx >= 0) {
            modifiedProfile.residencies[existingIdx]!.daysPresent = params.daysPresent;
            modifiedProfile.residencies[existingIdx]!.isDomiciled = true;
          } else {
            modifiedProfile.residencies.push({
              country: params.toCountry,
              daysPresent: params.daysPresent,
              isDomiciled: true,
              yearsResident: 0,
              status: `Relocated in ${params.year}`,
            });
          }
          // Reduce other residencies
          for (const r of modifiedProfile.residencies) {
            if (r.country !== params.toCountry) {
              r.daysPresent = Math.max(0, Math.min(r.daysPresent, 365 - params.daysPresent));
              r.isDomiciled = false;
            }
          }
        } else if (modification.params.type === 'spousal_planning') {
          const params = modification.params;
          const assetIds = params.assetIds.length > 0
            ? params.assetIds
            : modifiedProfile.assets.map((a) => a.id);
          for (const assetId of assetIds) {
            const asset = modifiedProfile.assets.find((a) => a.id === assetId);
            if (asset) {
              asset.ownershipType = 'trust';
              asset.notes = `${asset.notes}; ${params.strategy.toUpperCase()} structure applied`;
            }
          }
        }

        await new Promise((r) => setTimeout(r, 300));
        updateActivity(step2Id, 'complete');

        // Step 3: Compute new plan
        const step3Id = addActivity('Computing scenario estate plan...');
        const startTime = Date.now();
        const scenarioPlan = await api.computePlan(modifiedProfile);
        const computeTimeMs = Date.now() - startTime;
        updateActivity(step3Id, 'complete');

        // Step 4: Compute delta
        const step4Id = addActivity('Computing liability deltas...');
        const liabilityDeltas: LiabilityDelta[] = [];

        // Map baseline liabilities by jurisdiction+taxType
        const baselineMap = new Map<string, { amount: number; jurisdiction: string; taxType: string }>();
        for (const l of plan.liabilities) {
          const key = `${l.jurisdiction}:${l.taxType}`;
          const existing = baselineMap.get(key);
          baselineMap.set(key, {
            amount: (existing?.amount ?? 0) + l.netAmount,
            jurisdiction: l.jurisdiction,
            taxType: l.taxType,
          });
        }

        const scenarioMap = new Map<string, { amount: number; jurisdiction: string; taxType: string }>();
        for (const l of scenarioPlan.liabilities) {
          const key = `${l.jurisdiction}:${l.taxType}`;
          const existing = scenarioMap.get(key);
          scenarioMap.set(key, {
            amount: (existing?.amount ?? 0) + l.netAmount,
            jurisdiction: l.jurisdiction,
            taxType: l.taxType,
          });
        }

        // Merge keys
        const allKeys = new Set([...baselineMap.keys(), ...scenarioMap.keys()]);
        for (const key of allKeys) {
          const baseline = baselineMap.get(key);
          const scenario = scenarioMap.get(key);
          const baselineAmount = baseline?.amount ?? 0;
          const scenarioAmount = scenario?.amount ?? 0;
          const jurisdiction = (baseline?.jurisdiction ?? scenario?.jurisdiction ?? 'US') as import('@copia/types').CountryCode;
          const taxType = baseline?.taxType ?? scenario?.taxType ?? 'estate';
          const deltaAmount = scenarioAmount - baselineAmount;
          const deltaPct = baselineAmount !== 0 ? deltaAmount / baselineAmount : 0;

          liabilityDeltas.push({
            jurisdiction,
            taxType,
            baselineAmount,
            scenarioAmount,
            deltaAmount,
            deltaPct,
          });
        }

        // Compute trade-offs
        const tradeOffs: TradeOff[] = [];
        const netImpact = liabilityDeltas.reduce((sum, d) => sum + d.deltaAmount, 0);

        const decreases = liabilityDeltas.filter((d) => d.deltaAmount < 0);
        const increases = liabilityDeltas.filter((d) => d.deltaAmount > 0);

        if (decreases.length > 0 && increases.length > 0) {
          tradeOffs.push({
            description: 'This scenario shifts tax liability between jurisdictions.',
            pros: decreases.map(
              (d) =>
                `${COUNTRY_NAMES[d.jurisdiction] ?? d.jurisdiction} ${d.taxType}: reduced by ${formatCurrency(Math.abs(d.deltaAmount), plan.reportingCurrency)}`,
            ),
            cons: increases.map(
              (d) =>
                `${COUNTRY_NAMES[d.jurisdiction] ?? d.jurisdiction} ${d.taxType}: increased by ${formatCurrency(d.deltaAmount, plan.reportingCurrency)}`,
            ),
            financialImpact: netImpact,
          });
        }

        // New and resolved conflicts
        const baselineConflictIds = new Set(plan.conflicts.map((c) => c.description));
        const scenarioConflictIds = new Set(scenarioPlan.conflicts.map((c) => c.description));
        const newConflicts = [...scenarioConflictIds].filter((d) => !baselineConflictIds.has(d));
        const resolvedConflicts = [...baselineConflictIds].filter((d) => !scenarioConflictIds.has(d));

        // New and removed obligations
        const baselineObligations = new Set(plan.filingObligations.map((o) => `${o.jurisdiction}:${o.name}`));
        const scenarioObligations = new Set(scenarioPlan.filingObligations.map((o) => `${o.jurisdiction}:${o.name}`));
        const newObligations = [...scenarioObligations].filter((o) => !baselineObligations.has(o));
        const removedObligations = [...baselineObligations].filter((o) => !scenarioObligations.has(o));

        const delta: ScenarioDelta = {
          id: crypto.randomUUID(),
          modification,
          baselinePlanId: plan.id,
          scenarioPlanId: scenarioPlan.id,
          liabilityDeltas,
          netImpact,
          newConflicts,
          resolvedConflicts,
          newObligations,
          removedObligations,
          tradeOffs,
          computedAt: new Date().toISOString(),
        };

        await new Promise((r) => setTimeout(r, 200));
        updateActivity(step4Id, 'complete');

        // Step 5: Done
        const step5Id = addActivity(`Scenario analysis complete. Net impact: ${formatCurrency(netImpact, plan.reportingCurrency)}`);
        updateActivity(step5Id, 'complete');

        setCurrentDelta(delta);
        setScenarios((prev) => [...prev, delta]);

        emitEvent({
          type: 'scenario_explored',
          timestamp: new Date().toISOString(),
          sessionId: 'prototype',
          modificationType: modification.type,
          netImpact,
        });
      } catch (err) {
        addActivity(
          `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
          'error',
        );
        setError(err instanceof Error ? err.message : 'Failed to compute scenario');
      } finally {
        setProcessing(false);
        setLoading(false);
      }
    },
    [profile, plan, addActivity, updateActivity, setScenarios, setLoading, setError],
  );

  const handleNlSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!nlInput.trim() || !profile || !plan) return;

      // Parse simple NL input into a modification
      const input = nlInput.toLowerCase();
      let modification: ScenarioModification;

      if (input.includes('portugal') || input.includes('relocat')) {
        modification = {
          id: crypto.randomUUID(),
          type: 'relocate',
          description: nlInput,
          params: {
            type: 'relocate',
            personId: profile.id,
            toCountry: 'PT',
            daysPresent: 280,
            year: 2025,
          },
        };
      } else if (input.includes('gift') || input.includes('transfer')) {
        modification = {
          id: crypto.randomUUID(),
          type: 'gift_asset',
          description: nlInput,
          params: {
            type: 'gift_asset',
            assetId: profile.assets[0]?.id ?? '',
            recipientId: profile.family[0]?.id ?? '',
            fraction: 0.5,
          },
        };
      } else if (input.includes('qdot') || input.includes('trust') || input.includes('spousal')) {
        modification = {
          id: crypto.randomUUID(),
          type: 'spousal_planning',
          description: nlInput,
          params: {
            type: 'spousal_planning',
            strategy: 'qdot',
            assetIds: profile.assets.map((a) => a.id),
          },
        };
      } else {
        // Default: treat as a relocation to PT
        modification = {
          id: crypto.randomUUID(),
          type: 'relocate',
          description: nlInput,
          params: {
            type: 'relocate',
            personId: profile.id,
            toCountry: 'PT',
            daysPresent: 200,
            year: 2025,
          },
        };
      }

      setNlInput('');
      runScenario(modification);
    },
    [nlInput, profile, plan, runScenario],
  );

  const handleSuggestedScenario = useCallback(
    (scenario: PredefinedScenario) => {
      if (!profile) return;

      // Fill in dynamic IDs
      const mod = structuredClone(scenario.modification);
      if (mod.params.type === 'gift_asset') {
        mod.params.assetId = profile.assets.find((a) => a.assetClass === 'shares')?.id ?? profile.assets[0]?.id ?? '';
        mod.params.recipientId = profile.family[0]?.id ?? '';
      } else if (mod.params.type === 'spousal_planning') {
        mod.params.assetIds = profile.assets.map((a) => a.id);
      }

      runScenario(mod);
    },
    [profile, runScenario],
  );

  if (!plan || !profile) {
    return (
      <div>
        <h1 className="font-display text-3xl font-semibold text-forest-900 mb-2">
          Scenario Explorer
        </h1>
        <p className="font-serif text-forest-600 mb-8">
          Explore what-if scenarios to optimize your cross-jurisdiction estate plan.
        </p>
        <div className="card text-center py-16">
          <div className="mb-4">
            <svg className="w-12 h-12 mx-auto text-forest-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <h3 className="font-sans font-semibold text-forest-700 mb-2">No Plan Available</h3>
          <p className="font-serif text-sm text-forest-500 mb-6 max-w-md mx-auto">
            Create a profile and compute an estate plan first, then explore scenarios.
          </p>
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-forest-500 text-white font-sans font-medium text-sm rounded-institutional hover:bg-forest-600 transition-colors"
          >
            Go to Profile Editor
          </Link>
        </div>
      </div>
    );
  }

  const predefined = getPredefinedScenarios(profile.id);

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-forest-900 mb-2">
        Scenario Explorer
      </h1>
      <p className="font-serif text-forest-600 mb-6">
        Explore what-if scenarios. Describe a change in natural language or select a suggestion.
      </p>

      {/* NL Input Bar */}
      <form onSubmit={handleNlSubmit} className="mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={nlInput}
            onChange={(e) => setNlInput(e.target.value)}
            placeholder="e.g., 'What if Marcus relocates to Portugal?' or 'Gift shares to Priya'"
            disabled={processing}
            className="flex-1 px-4 py-3 bg-white border border-cream-200 rounded-institutional font-sans text-sm text-forest-800 placeholder-forest-300 focus:outline-none focus:ring-2 focus:ring-forest-300 focus:border-forest-400 transition-colors disabled:bg-cream-100"
          />
          <Button type="submit" disabled={processing || !nlInput.trim()}>
            {processing ? 'Analyzing...' : 'Explore'}
          </Button>
        </div>
      </form>

      {/* Suggested Scenarios */}
      {!currentDelta && !processing && (
        <div className="mb-8">
          <h3 className="font-sans text-xs uppercase tracking-wider text-forest-400 mb-3">
            Suggested Scenarios
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {predefined.map((scenario) => (
              <button
                key={scenario.label}
                type="button"
                onClick={() => handleSuggestedScenario(scenario)}
                className="card text-left hover:shadow-card-hover transition-shadow group"
              >
                <h4 className="font-sans text-sm font-semibold text-forest-800 mb-1 group-hover:text-forest-600">
                  {scenario.label}
                </h4>
                <p className="font-serif text-xs text-forest-500 leading-relaxed">
                  {scenario.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Activity Log */}
      {activityLog.length > 0 && (
        <div className="mb-6">
          <h3 className="font-sans text-xs uppercase tracking-wider text-forest-400 mb-3">
            Agent Activity
          </h3>
          <div className="card bg-forest-900 text-cream-100">
            <div className="space-y-2">
              {activityLog.map((step) => (
                <div key={step.id} className="flex items-center gap-3 text-sm">
                  <div className="flex-shrink-0">
                    {step.status === 'running' && (
                      <div className="w-3 h-3 rounded-full bg-gold-400 animate-pulse" />
                    )}
                    {step.status === 'complete' && (
                      <svg className="w-3.5 h-3.5 text-forest-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {step.status === 'error' && (
                      <svg className="w-3.5 h-3.5 text-danger-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    {step.status === 'pending' && (
                      <div className="w-3 h-3 rounded-full border border-forest-600" />
                    )}
                  </div>
                  <span className="font-mono text-xs text-forest-400">
                    {new Date(step.timestamp).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false,
                    })}
                  </span>
                  <span className={`font-sans text-sm ${step.status === 'error' ? 'text-danger-300' : 'text-cream-200'}`}>
                    {step.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delta Cards */}
      {currentDelta && (
        <>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold text-forest-900">
                Liability Changes
              </h2>
              <div className={`font-mono text-sm font-semibold ${currentDelta.netImpact < 0 ? 'text-forest-500' : currentDelta.netImpact > 0 ? 'text-danger-500' : 'text-forest-400'}`}>
                Net: {currentDelta.netImpact >= 0 ? '+' : ''}{formatCurrency(currentDelta.netImpact, plan.reportingCurrency)}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {currentDelta.liabilityDeltas
                .filter((d) => d.baselineAmount !== 0 || d.scenarioAmount !== 0)
                .map((delta, index) => (
                  <DeltaCard
                    key={`${delta.jurisdiction}-${delta.taxType}-${index}`}
                    delta={delta}
                    reportingCurrency={plan.reportingCurrency}
                  />
                ))}
            </div>
          </div>

          {/* Trade-offs */}
          {currentDelta.tradeOffs.length > 0 && (
            <div className="mb-6">
              {currentDelta.tradeOffs.map((tradeOff, index) => (
                <CalloutBox key={index} variant="warning" title="Trade-Off Analysis">
                  <p className="mb-2">{tradeOff.description}</p>
                  {tradeOff.pros.length > 0 && (
                    <div className="mb-2">
                      <span className="font-sans text-xs uppercase tracking-wider text-forest-500">
                        Advantages:
                      </span>
                      <ul className="mt-1 space-y-0.5">
                        {tradeOff.pros.map((pro, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-forest-500 mt-0.5 flex-shrink-0">+</span>
                            <span>{pro}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {tradeOff.cons.length > 0 && (
                    <div>
                      <span className="font-sans text-xs uppercase tracking-wider text-forest-500">
                        Disadvantages:
                      </span>
                      <ul className="mt-1 space-y-0.5">
                        {tradeOff.cons.map((con, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-danger-500 mt-0.5 flex-shrink-0">-</span>
                            <span>{con}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {tradeOff.financialImpact !== null && (
                    <div className="mt-2 pt-2 border-t border-gold-200">
                      <span className="font-sans text-xs text-forest-500">Net Financial Impact: </span>
                      <span className={`font-mono text-sm font-semibold ${(tradeOff.financialImpact ?? 0) < 0 ? 'text-forest-500' : 'text-danger-500'}`}>
                        {formatCurrency(tradeOff.financialImpact ?? 0, plan.reportingCurrency)}
                      </span>
                    </div>
                  )}
                </CalloutBox>
              ))}
            </div>
          )}

          {/* New/Resolved Conflicts & Obligations */}
          {(currentDelta.newConflicts.length > 0 || currentDelta.resolvedConflicts.length > 0) && (
            <div className="mb-6 space-y-3">
              {currentDelta.resolvedConflicts.map((desc, i) => (
                <CalloutBox key={`resolved-${i}`} variant="info" title="Conflict Resolved">
                  <p>{desc}</p>
                </CalloutBox>
              ))}
              {currentDelta.newConflicts.map((desc, i) => (
                <CalloutBox key={`new-${i}`} variant="conflict" title="New Conflict">
                  <p>{desc}</p>
                </CalloutBox>
              ))}
            </div>
          )}

          {/* Follow-Up Suggestions */}
          <div className="mb-8">
            <h3 className="font-sans text-xs uppercase tracking-wider text-forest-400 mb-3">
              Follow-Up Scenarios
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {predefined
                .filter((s) => s.modification.type !== currentDelta.modification.type)
                .slice(0, 3)
                .map((scenario) => (
                  <button
                    key={scenario.label}
                    type="button"
                    onClick={() => handleSuggestedScenario(scenario)}
                    disabled={processing}
                    className="card text-left hover:shadow-card-hover transition-shadow group disabled:opacity-50"
                  >
                    <h4 className="font-sans text-sm font-semibold text-forest-800 mb-1 group-hover:text-forest-600">
                      {scenario.label}
                    </h4>
                    <p className="font-serif text-xs text-forest-500 leading-relaxed">
                      {scenario.description}
                    </p>
                  </button>
                ))}
            </div>
          </div>
        </>
      )}

      {/* Previous Scenarios */}
      {scenarios.length > 1 && (
        <div className="mb-8">
          <h2 className="font-display text-xl font-semibold text-forest-900 mb-4">
            Previous Scenarios
          </h2>
          <div className="space-y-2">
            {scenarios
              .filter((s) => s.id !== currentDelta?.id)
              .reverse()
              .map((scenario) => (
                <div
                  key={scenario.id}
                  className="card flex items-center justify-between cursor-pointer hover:shadow-card-hover"
                  onClick={() => setCurrentDelta(scenario)}
                >
                  <div>
                    <span className="font-sans text-sm font-medium text-forest-800">
                      {scenario.modification.description}
                    </span>
                    <span className="font-mono text-xs text-forest-400 ml-3">
                      {new Date(scenario.computedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-sm font-semibold ${
                      scenario.netImpact < 0 ? 'text-forest-500' : scenario.netImpact > 0 ? 'text-danger-500' : 'text-forest-400'
                    }`}
                  >
                    {scenario.netImpact >= 0 ? '+' : ''}
                    {formatCurrency(scenario.netImpact, plan.reportingCurrency)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
