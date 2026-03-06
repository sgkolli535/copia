import React from 'react';
import type { TaxLayerResult } from '@copia/types';

interface CostStackCardProps {
  taxLayers: TaxLayerResult;
  className?: string;
}

function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = { USD: '$', GBP: '\u00a3', EUR: '\u20ac', INR: '\u20b9' };
  const sym = symbols[currency] ?? currency + ' ';
  return `${sym}${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const layerColors: Record<string, string> = {
  source_tax: 'bg-danger-100 text-danger-700',
  destination_tax: 'bg-danger-50 text-danger-600',
  treaty_relief: 'bg-forest-100 text-forest-700',
  transfer_costs: 'bg-gold-100 text-gold-700',
  timing: 'bg-cream-200 text-forest-600',
};

export default function CostStackCard({ taxLayers, className = '' }: CostStackCardProps) {
  const { layers, totalCost, effectiveRate, netAmount, currency } = taxLayers;

  return (
    <div className={`border border-cream-200 rounded-institutional bg-white overflow-hidden ${className}`}>
      <div className="bg-cream-100 px-4 py-3 border-b border-cream-200">
        <h3 className="font-sans text-sm font-semibold text-forest-900">5-Layer Cost Stack</h3>
      </div>

      <div className="divide-y divide-cream-100">
        {layers.map((layer) => {
          const isRelief = layer.layer === 'treaty_relief';
          const colorClass = layerColors[layer.layer] ?? 'bg-cream-100 text-forest-600';

          return (
            <div key={layer.layer} className="flex items-center justify-between px-4 py-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-block px-2 py-0.5 rounded-sm text-xs font-medium ${colorClass}`}>
                    {layer.layer.replace('_', ' ')}
                  </span>
                  <span className="font-mono text-xs text-forest-400">
                    {layer.confidence}
                  </span>
                </div>
                <p className="font-sans text-xs text-forest-600 mt-1">{layer.description}</p>
              </div>
              <div className="text-right ml-4 flex-shrink-0">
                <p className={`font-mono text-sm font-medium ${isRelief && layer.amount < 0 ? 'text-forest-600' : 'text-forest-900'}`}>
                  {isRelief && layer.amount < 0 ? '-' : ''}
                  {formatCurrency(layer.amount, currency)}
                </p>
                {layer.rate > 0 && (
                  <p className="font-mono text-xs text-forest-400">
                    {(layer.rate * 100).toFixed(1)}%
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-forest-800 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-sans text-xs text-forest-300">Total Cost</p>
          <p className="font-mono text-sm font-semibold text-cream-100">
            {formatCurrency(totalCost, currency)}
            <span className="text-forest-400 ml-2">({(effectiveRate * 100).toFixed(1)}%)</span>
          </p>
        </div>
        <div className="text-right">
          <p className="font-sans text-xs text-forest-300">Net Amount</p>
          <p className="font-mono text-sm font-semibold text-cream-100">
            {formatCurrency(netAmount, currency)}
          </p>
        </div>
      </div>
    </div>
  );
}
