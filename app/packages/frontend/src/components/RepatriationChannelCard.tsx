import React from 'react';
import type { RepatriationChannel } from '@copia/types';

interface RepatriationChannelCardProps {
  channel: RepatriationChannel;
  className?: string;
}

function formatCurrency(amount: number, currency = 'USD'): string {
  const symbols: Record<string, string> = { USD: '$', GBP: '\u00a3', EUR: '\u20ac', INR: '\u20b9' };
  const sym = symbols[currency] ?? currency + ' ';
  return `${sym}${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function RepatriationChannelCard({ channel, className = '' }: RepatriationChannelCardProps) {
  return (
    <div
      className={`border rounded-institutional bg-white overflow-hidden ${
        channel.recommended ? 'border-forest-400 ring-1 ring-forest-200' : 'border-cream-200'
      } ${className}`}
    >
      <div className={`px-4 py-3 border-b ${channel.recommended ? 'bg-forest-50 border-forest-200' : 'bg-cream-100 border-cream-200'}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-sans text-sm font-semibold text-forest-900">{channel.name}</h3>
          {channel.recommended && (
            <span className="inline-block px-2 py-0.5 bg-forest-500 text-white rounded-sm text-xs font-medium">
              Recommended
            </span>
          )}
        </div>
        <p className="font-sans text-xs text-forest-600 mt-1">{channel.description}</p>
      </div>

      <div className="px-4 py-3 space-y-3">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="font-sans text-xs text-forest-400 uppercase tracking-wide">Timeline</p>
            <p className="font-mono text-sm text-forest-900 mt-0.5">{channel.timeline}</p>
          </div>
          <div>
            <p className="font-sans text-xs text-forest-400 uppercase tracking-wide">Cost</p>
            <p className="font-mono text-sm text-forest-900 mt-0.5">
              {channel.totalCost > 0 ? formatCurrency(channel.totalCost) : 'None'}
            </p>
          </div>
          <div>
            <p className="font-sans text-xs text-forest-400 uppercase tracking-wide">Annual Limit</p>
            <p className="font-mono text-sm text-forest-900 mt-0.5">
              {channel.annualLimit !== null ? formatCurrency(channel.annualLimit) : 'No limit'}
            </p>
          </div>
        </div>

        {channel.constraints.length > 0 && (
          <div>
            <h4 className="font-sans text-xs font-semibold text-forest-600 uppercase tracking-wide mb-1">
              Constraints
            </h4>
            <ul className="space-y-0.5">
              {channel.constraints.map((c, i) => (
                <li key={i} className="font-sans text-xs text-forest-700 flex items-start gap-1.5">
                  <span className="text-forest-400 mt-0.5">-</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {channel.documentation.length > 0 && (
          <div>
            <h4 className="font-sans text-xs font-semibold text-forest-600 uppercase tracking-wide mb-1">
              Documentation Required
            </h4>
            <ul className="space-y-0.5">
              {channel.documentation.map((d, i) => (
                <li key={i} className="font-sans text-xs text-forest-700 flex items-start gap-1.5">
                  <span className="text-forest-400 mt-0.5">-</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
