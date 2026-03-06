import React, { useState } from 'react';
import type { PermittedAction } from '@copia/types';

interface PermittedActionRowProps {
  action: PermittedAction;
  className?: string;
}

export default function PermittedActionRow({ action, className = '' }: PermittedActionRowProps) {
  const [expanded, setExpanded] = useState(false);

  const badgeColor = action.permitted
    ? 'bg-forest-100 text-forest-700'
    : 'bg-danger-100 text-danger-700';
  const badgeLabel = action.permitted ? 'Permitted' : 'Prohibited';

  const repatBadge =
    action.repatriability === 'full'
      ? 'bg-forest-50 text-forest-600'
      : action.repatriability === 'partial'
        ? 'bg-gold-50 text-gold-700'
        : 'bg-danger-50 text-danger-600';

  return (
    <div className={`border border-cream-200 rounded-institutional bg-white ${className}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-cream-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`inline-block px-2 py-0.5 rounded-sm text-xs font-medium ${badgeColor}`}>
            {badgeLabel}
          </span>
          <span className="font-sans text-sm font-medium text-forest-900">{action.name}</span>
          <span className="font-mono text-xs text-forest-400">{action.country}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-block px-2 py-0.5 rounded-sm text-xs ${repatBadge}`}>
            {action.repatriability}
          </span>
          <svg
            className={`w-4 h-4 text-forest-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-cream-100 space-y-3">
          {action.restrictions.length > 0 && (
            <div className="mt-3">
              <h4 className="font-sans text-xs font-semibold text-forest-600 uppercase tracking-wide mb-1">
                Restrictions
              </h4>
              <ul className="space-y-1">
                {action.restrictions.map((r, i) => (
                  <li key={i} className="font-sans text-xs text-forest-700 flex items-start gap-1.5">
                    <span className="text-forest-400 mt-0.5">-</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {action.taxConsequences.length > 0 && (
            <div>
              <h4 className="font-sans text-xs font-semibold text-forest-600 uppercase tracking-wide mb-1">
                Tax Consequences
              </h4>
              <ul className="space-y-1">
                {action.taxConsequences.map((t, i) => (
                  <li key={i} className="font-sans text-xs text-forest-700 flex items-start gap-1.5">
                    <span className="text-forest-400 mt-0.5">-</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {action.filingObligations.length > 0 && (
            <div>
              <h4 className="font-sans text-xs font-semibold text-forest-600 uppercase tracking-wide mb-1">
                Filing Obligations
              </h4>
              <ul className="space-y-1">
                {action.filingObligations.map((f, i) => (
                  <li key={i} className="font-sans text-xs text-forest-700 flex items-start gap-1.5">
                    <span className="text-forest-400 mt-0.5">-</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {action.timeConstraints && (
            <div>
              <h4 className="font-sans text-xs font-semibold text-forest-600 uppercase tracking-wide mb-1">
                Time Constraints
              </h4>
              <p className="font-sans text-xs text-forest-700">{action.timeConstraints}</p>
            </div>
          )}

          {action.citations.length > 0 && (
            <div className="pt-2 border-t border-cream-100">
              <p className="font-mono text-xs text-forest-400">
                {action.citations.map((c) => c.reference).join('; ')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
