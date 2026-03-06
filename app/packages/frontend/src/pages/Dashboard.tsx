import React from 'react';
import { useAtomValue } from 'jotai';
import { Link } from 'react-router-dom';
import { planAtom, profileAtom } from '../store/atoms';
import ConfidenceBadge from '../components/ConfidenceBadge';
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

export default function Dashboard() {
  const plan = useAtomValue(planAtom);
  const profile = useAtomValue(profileAtom);

  if (!plan || !profile) {
    return (
      <div>
        <h1 className="font-display text-3xl font-semibold text-forest-900 mb-2">Dashboard</h1>
        <p className="font-serif text-forest-600 mb-8">
          Cross-jurisdiction estate planning intelligence at a glance.
        </p>

        <div className="card text-center py-16">
          <div className="mb-4">
            <svg className="w-12 h-12 mx-auto text-forest-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="font-sans font-semibold text-forest-700 mb-2">No Profile Loaded</h3>
          <p className="font-serif text-sm text-forest-500 mb-6 max-w-md mx-auto">
            Create a profile to see your cross-jurisdiction estate plan analysis.
            You can load a pre-configured golden persona to explore the system.
          </p>
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-forest-500 text-white font-sans font-medium text-sm rounded-institutional hover:bg-forest-600 transition-colors"
          >
            Go to Profile Editor
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  const treatyCount = plan.treatyApplications.length;
  const conflictCount = plan.conflicts.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-3xl font-semibold text-forest-900">Dashboard</h1>
        <span className="font-mono text-xs text-forest-400">
          Computed {new Date(plan.computedAt).toLocaleDateString()}
        </span>
      </div>
      <p className="font-serif text-forest-600 mb-8">
        Estate plan overview for {profile.name}.
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {/* Total Exposure */}
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
          <p className="font-sans text-xs text-forest-500 mt-1">
            Across {plan.liabilities.length} liabilit{plan.liabilities.length === 1 ? 'y' : 'ies'}
          </p>
        </div>

        {/* Active Treaties */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="font-sans text-xs uppercase tracking-wider text-forest-400">
              Active Treaties
            </span>
            <ConfidenceBadge tier="statutory" />
          </div>
          <div className="font-mono text-2xl font-semibold text-forest-900">
            {treatyCount}
          </div>
          <p className="font-sans text-xs text-forest-500 mt-1">
            {treatyCount > 0
              ? `Providing ${formatCurrency(
                  plan.treatyApplications.reduce((sum, t) => sum + t.totalRelief, 0),
                  plan.reportingCurrency,
                )} in relief`
              : 'No treaty relief applicable'}
          </p>
        </div>

        {/* Conflicts */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="font-sans text-xs uppercase tracking-wider text-forest-400">
              Conflicts
            </span>
            <ConfidenceBadge tier={conflictCount > 0 ? 'interpretive' : 'statutory'} />
          </div>
          <div className={`font-mono text-2xl font-semibold ${conflictCount > 0 ? 'text-danger-500' : 'text-forest-900'}`}>
            {conflictCount}
          </div>
          <p className="font-sans text-xs text-forest-500 mt-1">
            {conflictCount > 0
              ? 'Potential double taxation identified'
              : 'No conflicts detected'}
          </p>
        </div>
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

      {/* Conflict Callouts */}
      {plan.conflicts.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display text-xl font-semibold text-forest-900 mb-4">
            Conflict Alerts
          </h2>
          <div className="space-y-3">
            {plan.conflicts.map((conflict) => (
              <CalloutBox
                key={conflict.id}
                variant="conflict"
                title={`${conflict.jurisdictions.map((c) => COUNTRY_NAMES[c] ?? c).join(' / ')} Conflict`}
              >
                <p>{conflict.description}</p>
                {conflict.resolution && (
                  <p className="mt-2 font-sans text-xs text-forest-500">
                    Resolution: {conflict.resolution}
                  </p>
                )}
              </CalloutBox>
            ))}
          </div>
        </div>
      )}

      {/* Filing Deadlines */}
      {plan.filingObligations.length > 0 && (
        <div>
          <h2 className="font-display text-xl font-semibold text-forest-900 mb-4">
            Filing Deadlines
          </h2>
          <div className="space-y-2">
            {plan.filingObligations.map((obligation, index) => (
              <div key={`${obligation.jurisdiction}-${obligation.name}-${index}`} className="card p-0 overflow-hidden">
                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-cream-50 border-b border-cream-200">
                  <span className="font-mono text-xs font-medium text-forest-500 bg-cream-200 px-1.5 py-0.5 rounded-sm">
                    {obligation.jurisdiction}
                  </span>
                  <span className="font-sans text-sm font-semibold text-forest-800">
                    {obligation.name}
                  </span>
                  <ConfidenceBadge tier={obligation.confidence} />
                </div>
                <div className="px-4 py-2.5">
                  <span className="font-sans text-xs font-semibold text-forest-400 uppercase tracking-wider">Deadline: </span>
                  <span className="font-sans text-sm text-forest-700">{obligation.deadline}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
