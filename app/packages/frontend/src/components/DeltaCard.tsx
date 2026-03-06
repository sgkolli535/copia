import React from 'react';
import type { LiabilityDelta } from '@copia/types';

interface DeltaCardProps {
  delta: LiabilityDelta;
  reportingCurrency?: string;
  className?: string;
}

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

function formatPct(pct: number): string {
  const sign = pct > 0 ? '+' : '';
  return `${sign}${(pct * 100).toFixed(1)}%`;
}

export default function DeltaCard({ delta, reportingCurrency = 'USD', className = '' }: DeltaCardProps) {
  const isDecrease = delta.deltaAmount < 0;
  const isIncrease = delta.deltaAmount > 0;
  const isNeutral = delta.deltaAmount === 0;

  const impactColor = isDecrease
    ? 'text-forest-500'
    : isIncrease
    ? 'text-danger-500'
    : 'text-forest-400';

  const impactBg = isDecrease
    ? 'bg-forest-50 border-forest-200'
    : isIncrease
    ? 'bg-danger-50 border-danger-200'
    : 'bg-cream-100 border-cream-200';

  return (
    <div className={`bg-white rounded-institutional shadow-card border border-cream-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-cream-100 border-b border-cream-200">
        <div className="flex items-center justify-between">
          <h4 className="font-sans font-semibold text-sm text-forest-800">
            {COUNTRY_NAMES[delta.jurisdiction] ?? delta.jurisdiction}
          </h4>
          <span className="font-mono text-xs text-forest-500 uppercase">{delta.taxType}</span>
        </div>
      </div>

      {/* Comparison */}
      <div className="flex items-stretch">
        {/* Baseline */}
        <div className="flex-1 px-4 py-4 border-r border-cream-200">
          <span className="block font-sans text-xs uppercase tracking-wider text-forest-400 mb-1">
            Baseline
          </span>
          <span className="block font-mono text-lg font-medium text-forest-800">
            {formatCurrency(delta.baselineAmount, reportingCurrency)}
          </span>
        </div>

        {/* Arrow */}
        <div className="flex items-center px-3">
          <svg
            className={`w-5 h-5 ${impactColor}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </div>

        {/* Scenario */}
        <div className="flex-1 px-4 py-4">
          <span className="block font-sans text-xs uppercase tracking-wider text-forest-400 mb-1">
            Scenario
          </span>
          <span className="block font-mono text-lg font-medium text-forest-800">
            {formatCurrency(delta.scenarioAmount, reportingCurrency)}
          </span>
        </div>
      </div>

      {/* Net Impact */}
      <div className={`px-4 py-3 border-t ${impactBg}`}>
        <div className="flex items-center justify-between">
          <span className="font-sans text-xs uppercase tracking-wider text-forest-500">
            Net Impact
          </span>
          <div className="flex items-center gap-2">
            <span className={`font-mono text-sm font-semibold ${impactColor}`}>
              {isDecrease ? '' : isIncrease ? '+' : ''}
              {formatCurrency(delta.deltaAmount, reportingCurrency)}
            </span>
            {!isNeutral && (
              <span className={`font-mono text-xs ${impactColor}`}>
                ({formatPct(delta.deltaPct)})
              </span>
            )}
            {isDecrease && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-forest-100 text-forest-600 font-mono text-xs">
                Savings
              </span>
            )}
            {isIncrease && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-danger-100 text-danger-600 font-mono text-xs">
                Increase
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
