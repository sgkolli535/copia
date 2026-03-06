import React from 'react';
import type { Liability } from '@copia/types';
import ConfidenceBadge from './ConfidenceBadge';

interface LiabilityTableProps {
  liabilities: Liability[];
  className?: string;
}

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  IN: 'India',
  PT: 'Portugal',
};

const TAX_TYPE_LABELS: Record<string, string> = {
  estate: 'Estate Tax',
  inheritance: 'Inheritance Tax',
  gift: 'Gift Tax',
  capital_gains: 'Capital Gains',
  stamp_duty: 'Stamp Duty',
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

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export default function LiabilityTable({ liabilities, className = '' }: LiabilityTableProps) {
  if (liabilities.length === 0) {
    return (
      <div className={`text-center py-8 text-forest-400 font-sans text-sm ${className}`}>
        No liabilities computed yet.
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-forest-700 text-white">
            <th className="text-left px-4 py-3 font-sans font-semibold text-xs uppercase tracking-wider">
              Jurisdiction
            </th>
            <th className="text-left px-4 py-3 font-sans font-semibold text-xs uppercase tracking-wider">
              Tax Type
            </th>
            <th className="text-right px-4 py-3 font-sans font-semibold text-xs uppercase tracking-wider">
              Gross
            </th>
            <th className="text-right px-4 py-3 font-sans font-semibold text-xs uppercase tracking-wider">
              Relief
            </th>
            <th className="text-right px-4 py-3 font-sans font-semibold text-xs uppercase tracking-wider">
              Net
            </th>
            <th className="text-right px-4 py-3 font-sans font-semibold text-xs uppercase tracking-wider">
              Rate
            </th>
            <th className="text-center px-4 py-3 font-sans font-semibold text-xs uppercase tracking-wider">
              Confidence
            </th>
          </tr>
        </thead>
        <tbody>
          {liabilities.map((liability, index) => (
            <tr
              key={liability.id}
              className={[
                'border-b border-cream-200',
                index % 2 === 0 ? 'bg-cream-100' : 'bg-white',
              ].join(' ')}
            >
              <td className="px-4 py-3 font-sans text-sm text-forest-800">
                <span className="font-mono text-xs text-forest-500 mr-1.5">{liability.jurisdiction}</span>
                {COUNTRY_NAMES[liability.jurisdiction] ?? liability.jurisdiction}
              </td>
              <td className="px-4 py-3 font-sans text-sm text-forest-700">
                {TAX_TYPE_LABELS[liability.taxType] ?? liability.taxType}
              </td>
              <td className="px-4 py-3 text-right font-mono text-sm text-forest-800">
                {formatCurrency(liability.grossAmount, liability.currency)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-sm text-forest-600">
                {liability.reliefAmount > 0 ? (
                  <span className="text-forest-500">
                    -{formatCurrency(liability.reliefAmount, liability.currency)}
                  </span>
                ) : (
                  <span className="text-forest-300">&mdash;</span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-mono text-sm font-medium text-forest-900">
                {formatCurrency(liability.netAmount, liability.currency)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-sm text-forest-700">
                {formatRate(liability.effectiveRate)}
              </td>
              <td className="px-4 py-3 text-center">
                <ConfidenceBadge tier={liability.confidence} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
