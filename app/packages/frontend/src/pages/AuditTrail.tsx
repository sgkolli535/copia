import React, { useState, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { Link } from 'react-router-dom';
import { planAtom } from '../store/atoms';
import AuditTimeline from '../components/AuditTimeline';
import SourceCitation from '../components/SourceCitation';
import type { AuditEntry, SourceCitation as SourceCitationType } from '@copia/types';

export default function AuditTrail() {
  const plan = useAtomValue(planAtom);
  const [stepFilter, setStepFilter] = useState<string>('all');

  // Extract all unique step types
  const stepTypes = useMemo(() => {
    if (!plan) return [];
    const types = new Set(plan.auditTrail.map((e) => e.step));
    return ['all', ...types];
  }, [plan]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    if (!plan) return [];
    if (stepFilter === 'all') return plan.auditTrail;
    return plan.auditTrail.filter((e) => e.step === stepFilter);
  }, [plan, stepFilter]);

  // Collect all citations across the plan
  const allCitations = useMemo(() => {
    if (!plan) return [];
    const citations: SourceCitationType[] = [];
    const seen = new Set<string>();

    for (const entry of plan.auditTrail) {
      for (const c of entry.citations) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          citations.push(c);
        }
      }
    }
    for (const liability of plan.liabilities) {
      for (const c of liability.citations) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          citations.push(c);
        }
      }
    }
    for (const conflict of plan.conflicts) {
      for (const c of conflict.citations) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          citations.push(c);
        }
      }
    }
    for (const obligation of plan.filingObligations) {
      for (const c of obligation.citations) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          citations.push(c);
        }
      }
    }

    return citations;
  }, [plan]);

  function formatStepLabel(step: string): string {
    if (step === 'all') return 'All Steps';
    return step
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  if (!plan) {
    return (
      <div>
        <h1 className="font-display text-3xl font-semibold text-forest-900 mb-2">Audit Trail</h1>
        <p className="font-serif text-forest-600 mb-8">
          Full traceability for every determination in the estate plan.
        </p>
        <div className="card text-center py-16">
          <div className="mb-4">
            <svg className="w-12 h-12 mx-auto text-forest-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h3 className="font-sans font-semibold text-forest-700 mb-2">No Audit Trail Available</h3>
          <p className="font-serif text-sm text-forest-500 mb-6 max-w-md mx-auto">
            Compute an estate plan to generate a full audit trail with citations.
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

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-3xl font-semibold text-forest-900">Audit Trail</h1>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-forest-400 bg-cream-100 px-2 py-1 rounded-institutional">
            Engine v{plan.engineVersion}
          </span>
          <span className="font-mono text-xs text-forest-400 bg-cream-100 px-2 py-1 rounded-institutional">
            Prompt v{plan.promptVersion}
          </span>
        </div>
      </div>
      <p className="font-serif text-forest-600 mb-6">
        Complete audit trail for plan {plan.id.slice(0, 8)}... computed on{' '}
        {new Date(plan.computedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>

      {/* Filter Bar */}
      <div className="mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-sans text-xs uppercase tracking-wider text-forest-400">
            Filter by step:
          </span>
          {stepTypes.map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => setStepFilter(step)}
              className={[
                'px-3 py-1.5 rounded-institutional font-sans text-xs border transition-colors',
                stepFilter === step
                  ? 'bg-forest-500 text-white border-forest-500'
                  : 'bg-white text-forest-600 border-cream-200 hover:border-forest-300',
              ].join(' ')}
            >
              {formatStepLabel(step)}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="card mb-8">
        <AuditTimeline entries={filteredEntries} />
      </div>

      {/* Source Citations */}
      {allCitations.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display text-xl font-semibold text-forest-900 mb-4">
            All Source Citations
          </h2>
          <div className="space-y-2">
            {allCitations.map((citation) => (
              <SourceCitation key={citation.id} citation={citation} />
            ))}
          </div>
        </div>
      )}

      {/* Exchange Rates */}
      {plan.exchangeRates.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display text-xl font-semibold text-forest-900 mb-4">
            Exchange Rates Used
          </h2>
          <div className="card">
            <table className="w-full">
              <thead>
                <tr className="border-b border-cream-200">
                  <th className="text-left py-2 font-sans text-xs uppercase tracking-wider text-forest-500">
                    Pair
                  </th>
                  <th className="text-right py-2 font-sans text-xs uppercase tracking-wider text-forest-500">
                    Rate
                  </th>
                  <th className="text-right py-2 font-sans text-xs uppercase tracking-wider text-forest-500">
                    As Of
                  </th>
                  <th className="text-right py-2 font-sans text-xs uppercase tracking-wider text-forest-500">
                    Source
                  </th>
                </tr>
              </thead>
              <tbody>
                {plan.exchangeRates.map((rate, index) => (
                  <tr key={`${rate.from}-${rate.to}-${index}`} className="border-b border-cream-100 last:border-b-0">
                    <td className="py-2 font-mono text-sm text-forest-800">
                      {rate.from} / {rate.to}
                    </td>
                    <td className="py-2 text-right font-mono text-sm text-forest-700">
                      {rate.rate.toFixed(4)}
                    </td>
                    <td className="py-2 text-right font-mono text-xs text-forest-500">
                      {new Date(rate.asOf).toLocaleDateString()}
                    </td>
                    <td className="py-2 text-right font-mono text-xs text-forest-400">
                      {rate.source}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Raw Audit Data */}
      <div className="mb-8">
        <details>
          <summary className="font-sans text-sm text-forest-500 cursor-pointer hover:text-forest-700 transition-colors">
            View raw audit data (JSON)
          </summary>
          <div className="mt-3 card">
            <pre className="font-mono text-xs text-forest-700 overflow-x-auto max-h-96 overflow-y-auto scrollbar-thin">
              {JSON.stringify(plan.auditTrail, null, 2)}
            </pre>
          </div>
        </details>
      </div>
    </div>
  );
}
