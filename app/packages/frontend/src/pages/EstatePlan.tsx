import React, { useState } from 'react';
import { useAtomValue } from 'jotai';
import { Link } from 'react-router-dom';
import { planAtom, profileAtom, narrationAtom, narrationLoadingAtom } from '../store/atoms';
import ConfidenceBadge from '../components/ConfidenceBadge';
import LiabilityTable from '../components/LiabilityTable';
import CalloutBox from '../components/CalloutBox';
import AuditTimeline from '../components/AuditTimeline';
import SourceCitation from '../components/SourceCitation';
import { emitEvent } from '../store/analytics';

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  IN: 'India',
  PT: 'Portugal',
};

const RELIEF_METHOD_LABELS: Record<string, string> = {
  credit: 'Foreign Tax Credit',
  exemption: 'Exemption',
  exemption_with_progression: 'Exemption with Progression',
  none: 'None',
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

// ---- Progressive Disclosure Component ----

interface DisclosureLevel {
  level: 'L0' | 'L1' | 'L2' | 'L3';
  label: string;
}

const DISCLOSURE_LEVELS: DisclosureLevel[] = [
  { level: 'L0', label: 'Headline' },
  { level: 'L1', label: 'Explanation' },
  { level: 'L2', label: 'Citation' },
  { level: 'L3', label: 'Raw Data' },
];

export default function EstatePlan() {
  const plan = useAtomValue(planAtom);
  const profile = useAtomValue(profileAtom);
  const narration = useAtomValue(narrationAtom);
  const narrationLoading = useAtomValue(narrationLoadingAtom);
  const [disclosureLevel, setDisclosureLevel] = useState<'L0' | 'L1' | 'L2' | 'L3'>('L1');
  const [showAudit, setShowAudit] = useState(false);
  const [expandedObligations, setExpandedObligations] = useState<Set<number>>(new Set());

  if (!plan || !profile) {
    return (
      <div>
        <h1 className="font-display text-3xl font-semibold text-forest-900 mb-2">Estate Plan</h1>
        <p className="font-serif text-forest-600 mb-8">
          Comprehensive cross-jurisdiction estate plan analysis.
        </p>
        <div className="card text-center py-16">
          <div className="mb-4">
            <svg className="w-12 h-12 mx-auto text-forest-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="font-sans font-semibold text-forest-700 mb-2">No Plan Computed</h3>
          <p className="font-serif text-sm text-forest-500 mb-6 max-w-md mx-auto">
            Create a profile and save it to generate an estate plan analysis.
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

  const treatyCount = plan.treatyApplications.length;
  const conflictCount = plan.conflicts.length;
  const totalRelief = plan.treatyApplications.reduce((sum, t) => sum + t.totalRelief, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-3xl font-semibold text-forest-900">Estate Plan</h1>
        <div className="flex items-center gap-2">
          <span className="font-sans text-xs text-forest-400 mr-2">Detail Level:</span>
          {DISCLOSURE_LEVELS.map((dl) => (
            <button
              key={dl.level}
              type="button"
              onClick={() => setDisclosureLevel(dl.level)}
              className={[
                'px-2.5 py-1 rounded-institutional font-mono text-xs border transition-colors',
                disclosureLevel === dl.level
                  ? 'bg-forest-500 text-white border-forest-500'
                  : 'bg-white text-forest-500 border-cream-200 hover:border-forest-300',
              ].join(' ')}
            >
              {dl.label}
            </button>
          ))}
        </div>
      </div>
      <p className="font-serif text-forest-600 mb-8">
        Analysis for {profile.name} — computed{' '}
        {new Date(plan.computedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="font-sans text-xs uppercase tracking-wider text-forest-400">
              Total Exposure
            </span>
            <ConfidenceBadge tier="statutory" />
          </div>
          <div className="font-mono text-2xl font-semibold text-forest-900">
            {formatCurrency(plan.totalExposure, plan.reportingCurrency)}
          </div>
          {disclosureLevel !== 'L0' && (
            <p className="font-serif text-xs text-forest-500 mt-2">
              Sum of net liabilities across {plan.liabilities.length} obligation(s) in{' '}
              {new Set(plan.liabilities.map((l) => l.jurisdiction)).size} jurisdiction(s).
            </p>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="font-sans text-xs uppercase tracking-wider text-forest-400">
              Treaty Relief
            </span>
            <ConfidenceBadge tier="statutory" />
          </div>
          <div className="font-mono text-2xl font-semibold text-forest-500">
            {totalRelief > 0 ? formatCurrency(totalRelief, plan.reportingCurrency) : '--'}
          </div>
          {disclosureLevel !== 'L0' && (
            <p className="font-serif text-xs text-forest-500 mt-2">
              {treatyCount} active treat{treatyCount === 1 ? 'y' : 'ies'} providing double-tax relief.
            </p>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="font-sans text-xs uppercase tracking-wider text-forest-400">
              Conflicts
            </span>
            <ConfidenceBadge tier={conflictCount > 0 ? 'advisory' : 'statutory'} />
          </div>
          <div className={`font-mono text-2xl font-semibold ${conflictCount > 0 ? 'text-danger-500' : 'text-forest-900'}`}>
            {conflictCount}
          </div>
          {disclosureLevel !== 'L0' && (
            <p className="font-serif text-xs text-forest-500 mt-2">
              {conflictCount > 0
                ? `Exposure: ${formatCurrency(
                    plan.conflicts.reduce((sum, c) => sum + c.exposureAmount, 0),
                    plan.reportingCurrency,
                  )}`
                : 'No conflicting obligations detected.'}
            </p>
          )}
        </div>
      </div>

      {/* Liability Table */}
      <div className="mb-8">
        <h2 className="font-display text-xl font-semibold text-forest-900 mb-4">Liabilities</h2>
        <div className="card p-0 overflow-hidden">
          <LiabilityTable liabilities={plan.liabilities} />
        </div>
      </div>

      {/* Treaty Details -- visible at L1+ */}
      {disclosureLevel !== 'L0' && plan.treatyApplications.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display text-xl font-semibold text-forest-900 mb-4">
            Treaty Applications
          </h2>
          <div className="space-y-3">
            {plan.treatyApplications.map((ta) => {
              const [c1, c2] = ta.treaty.split('-') as [string, string];
              return (
                <div key={ta.treaty} className="card">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-forest-800">
                        {ta.treaty}
                      </span>
                      <span className="font-sans text-sm text-forest-500">
                        {COUNTRY_NAMES[c1] ?? c1} &ndash; {COUNTRY_NAMES[c2] ?? c2}
                      </span>
                    </div>
                    <span className="font-sans text-xs px-2 py-1 bg-forest-50 text-forest-600 rounded-institutional">
                      {RELIEF_METHOD_LABELS[ta.reliefMethod] ?? ta.reliefMethod}
                    </span>
                  </div>

                  <div className="font-mono text-lg font-semibold text-forest-500 mb-3">
                    Relief: {formatCurrency(ta.totalRelief, ta.currency)}
                  </div>

                  {/* Relief Details -- visible at L2+ */}
                  {(disclosureLevel === 'L2' || disclosureLevel === 'L3') && ta.reliefDetails.length > 0 && (
                    <div className="border-t border-cream-200 pt-3">
                      <span className="font-sans text-xs uppercase tracking-wider text-forest-400 block mb-2">
                        Relief Breakdown
                      </span>
                      <div className="space-y-2">
                        {ta.reliefDetails.map((rd, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-sm bg-cream-50 rounded-institutional px-3 py-2"
                          >
                            <div>
                              <span className="font-sans text-forest-700 capitalize">
                                {rd.assetClass.replace(/_/g, ' ')}
                              </span>
                              <span className="font-mono text-xs text-forest-400 ml-2">
                                Art. {rd.articleRef}
                              </span>
                            </div>
                            <div className="font-mono text-sm">
                              <span className="text-forest-400">
                                {formatCurrency(rd.grossLiability, ta.currency)}
                              </span>
                              <span className="mx-2 text-forest-300">&rarr;</span>
                              <span className="text-forest-600 font-medium">
                                {formatCurrency(rd.netLiability, ta.currency)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Narration */}
      {disclosureLevel !== 'L0' && (
        <div className="mb-8">
          <h2 className="font-display text-xl font-semibold text-forest-900 mb-4">
            AI Narration
          </h2>
          <div className="card border-l-4 border-l-forest-500">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-forest-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="font-sans text-xs uppercase tracking-wider text-forest-500">
                Narrative Summary
              </span>
              <ConfidenceBadge tier="advisory" />
            </div>
            <div className="font-serif text-sm text-forest-700 leading-relaxed space-y-3">
              {narrationLoading && (
                <div className="flex items-center gap-2 text-forest-400">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="font-sans text-xs">Generating narrative...</span>
                </div>
              )}
              {narration && !narrationLoading && narration.split('\n').filter(Boolean).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
              {!narration && !narrationLoading && (
                <p className="text-xs text-forest-400 italic">
                  AI narration unavailable. Set the ANTHROPIC_API_KEY environment variable (or
                  AI_PROVIDER + corresponding key) and recompute the plan to generate a narrative.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Conflict Callouts */}
      {plan.conflicts.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display text-xl font-semibold text-forest-900 mb-4">Conflicts</h2>
          <div className="space-y-3">
            {plan.conflicts.map((conflict) => (
              <CalloutBox
                key={conflict.id}
                variant="conflict"
                title={`${conflict.jurisdictions.map((c) => COUNTRY_NAMES[c] ?? c).join(' / ')} — Double Taxation Risk`}
              >
                <p>{conflict.description}</p>
                {disclosureLevel !== 'L0' && (
                  <>
                    <p className="mt-2">
                      <span className="font-sans text-xs uppercase tracking-wider text-forest-500">
                        Exposure:{' '}
                      </span>
                      <span className="font-mono text-sm">
                        {formatCurrency(conflict.exposureAmount, conflict.currency)}
                      </span>
                    </p>
                    <p className="mt-1">
                      <span className="font-sans text-xs uppercase tracking-wider text-forest-500">
                        Resolution:{' '}
                      </span>
                      <span className="text-sm">{conflict.resolution}</span>
                    </p>
                  </>
                )}
                {/* Citations at L2+ */}
                {(disclosureLevel === 'L2' || disclosureLevel === 'L3') && conflict.citations.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {conflict.citations.map((c) => (
                      <SourceCitation key={c.id} citation={c} />
                    ))}
                  </div>
                )}
              </CalloutBox>
            ))}
          </div>
        </div>
      )}

      {/* Filing Obligations */}
      {plan.filingObligations.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display text-xl font-semibold text-forest-900 mb-4">
            Filing Obligations
          </h2>
          <div className="space-y-3">
            {plan.filingObligations.map((obligation, index) => {
              const isExpanded = expandedObligations.has(index);
              const toggleExpanded = () => {
                setExpandedObligations((prev) => {
                  const next = new Set(prev);
                  if (next.has(index)) next.delete(index);
                  else next.add(index);
                  return next;
                });
              };

              return (
                <div
                  key={`${obligation.jurisdiction}-${obligation.name}-${index}`}
                  className="card p-0 overflow-hidden"
                >
                  {/* Header strip */}
                  <div className="flex items-center gap-2.5 px-4 py-2.5 bg-cream-50 border-b border-cream-200">
                    <span className="font-mono text-xs font-medium text-forest-500 bg-cream-200 px-1.5 py-0.5 rounded-sm">
                      {obligation.jurisdiction}
                    </span>
                    <span className="font-sans text-sm font-semibold text-forest-800">
                      {obligation.name}
                    </span>
                    <ConfidenceBadge tier={obligation.confidence} />
                  </div>

                  {/* Deadline / Penalty grid */}
                  <div className="grid grid-cols-2 divide-x divide-cream-200">
                    <div className="px-4 py-3">
                      <span className="block font-sans text-xs font-semibold text-forest-400 uppercase tracking-wider mb-1">
                        Deadline
                      </span>
                      <p className="font-sans text-sm text-forest-700">{obligation.deadline}</p>
                    </div>
                    {disclosureLevel !== 'L0' ? (
                      <div className="px-4 py-3">
                        <span className="block font-sans text-xs font-semibold text-danger-400 uppercase tracking-wider mb-1">
                          Penalty
                        </span>
                        <p className="font-sans text-sm text-danger-600">{obligation.penalty}</p>
                      </div>
                    ) : (
                      <div className="px-4 py-3">
                        <span className="block font-sans text-xs font-semibold text-forest-400 uppercase tracking-wider mb-1">
                          Penalty
                        </span>
                        <p className="font-sans text-xs text-forest-400 italic">
                          Increase detail level to view
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Expandable description */}
                  <button
                    type="button"
                    onClick={toggleExpanded}
                    className="w-full flex items-center gap-2 px-4 py-2 border-t border-cream-200 text-left hover:bg-cream-50 transition-colors"
                  >
                    <svg
                      className={`w-3.5 h-3.5 text-forest-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="font-sans text-xs font-medium text-forest-500">Description</span>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-3 border-t border-cream-100">
                      <p className="font-serif text-sm text-forest-600 pt-2">{obligation.description}</p>
                      {/* Citations at L2+ */}
                      {(disclosureLevel === 'L2' || disclosureLevel === 'L3') &&
                        obligation.citations.length > 0 && (
                          <div className="mt-3 space-y-1">
                            {obligation.citations.map((c) => (
                              <SourceCitation key={c.id} citation={c} />
                            ))}
                          </div>
                        )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Audit Trail Toggle */}
      <div className="mb-8">
        <button
          type="button"
          onClick={() => setShowAudit(!showAudit)}
          className="flex items-center gap-2 font-sans text-sm font-medium text-forest-600 hover:text-forest-800 transition-colors"
        >
          <svg
            className={[
              'w-4 h-4 transition-transform duration-200',
              showAudit ? 'rotate-180' : '',
            ].join(' ')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {showAudit ? 'Hide' : 'Show'} Audit Trail ({plan.auditTrail.length} entries)
        </button>

        {showAudit && (
          <div className="mt-4 card">
            <AuditTimeline entries={plan.auditTrail} />
            <div className="mt-4 pt-3 border-t border-cream-200 flex items-center gap-4">
              <span className="font-mono text-xs text-forest-400">
                Engine v{plan.engineVersion}
              </span>
              <span className="font-mono text-xs text-forest-400">
                Prompt v{plan.promptVersion}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Staleness Warnings */}
      {plan.warnings && plan.warnings.length > 0 && (
        <div className="mb-8">
          <CalloutBox variant="warning" title="Data Staleness Warnings">
            <ul className="list-disc list-inside space-y-1">
              {plan.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </CalloutBox>
        </div>
      )}

      {/* Professional Referral */}
      <div className="mb-8">
        <div className="card border-l-4 border-l-gold-400 bg-gold-50">
          <h3 className="font-sans font-semibold text-sm text-forest-900 mb-2">
            Consult a Professional
          </h3>
          <p className="font-serif text-sm text-forest-700 mb-3">
            This analysis is for informational purposes only. For implementation, consult qualified professionals in the relevant jurisdictions.
          </p>
          <div className="flex flex-wrap gap-2">
            {[...new Set(plan.liabilities.map((l) => l.jurisdiction))].map((jurisdiction) => (
              <button
                key={jurisdiction}
                type="button"
                onClick={() => {
                  emitEvent({
                    type: 'professional_referral_clicked',
                    jurisdiction,
                    timestamp: new Date().toISOString(),
                    sessionId: 'prototype',
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-cream-200 rounded-institutional font-sans text-sm text-forest-700 hover:bg-cream-100 transition-colors"
              >
                <span className="font-mono text-xs font-medium">{jurisdiction}</span>
                Find {COUNTRY_NAMES[jurisdiction] ?? jurisdiction} advisor
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Raw Data at L3 */}
      {disclosureLevel === 'L3' && (
        <div className="mb-8">
          <h2 className="font-display text-xl font-semibold text-forest-900 mb-4">
            Raw Plan Data
          </h2>
          <div className="card">
            <pre className="font-mono text-xs text-forest-700 overflow-x-auto max-h-96 overflow-y-auto scrollbar-thin">
              {JSON.stringify(plan, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
