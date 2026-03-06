import React from 'react';
import { useAtomValue } from 'jotai';
import { useNavigate } from 'react-router-dom';
import { moneyEventAtom, mobilityResultAtom } from '../store/atoms';
import CostStackCard from '../components/CostStackCard';
import RepatriationChannelCard from '../components/RepatriationChannelCard';
import CalloutBox from '../components/CalloutBox';

export default function MobilityAnalysis() {
  const moneyEvent = useAtomValue(moneyEventAtom);
  const mobilityResult = useAtomValue(mobilityResultAtom);
  const navigate = useNavigate();

  if (!moneyEvent) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-white border border-cream-200 rounded-institutional p-8 max-w-md">
          <p className="font-sans text-sm text-forest-600 mb-4">
            No money event configured. Start by defining a cross-border money event.
          </p>
          <button
            onClick={() => navigate('/money-event')}
            className="px-4 py-2 bg-forest-500 text-white rounded-institutional text-sm font-medium hover:bg-forest-600 transition-colors"
          >
            Create Money Event
          </button>
        </div>
      </div>
    );
  }

  // If no result yet, show event summary with placeholder
  if (!mobilityResult) {
    return (
      <div>
        <h2 className="font-display text-2xl font-semibold text-forest-900 mb-1">Mobility Analysis</h2>
        <p className="font-sans text-sm text-forest-500 mb-6">
          Analyzing {moneyEvent.type.replace('_', ' ')} from {moneyEvent.sourceCountry} to {moneyEvent.destinationCountry}...
        </p>

        <div className="bg-white border border-cream-200 rounded-institutional p-6">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="font-sans text-xs text-forest-400 uppercase">Event</p>
              <p className="font-sans text-sm font-medium text-forest-900 mt-1">{moneyEvent.type.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="font-sans text-xs text-forest-400 uppercase">Amount</p>
              <p className="font-mono text-sm font-medium text-forest-900 mt-1">
                {moneyEvent.currency} {moneyEvent.amount.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="font-sans text-xs text-forest-400 uppercase">From</p>
              <p className="font-sans text-sm font-medium text-forest-900 mt-1">{moneyEvent.sourceCountry}</p>
            </div>
            <div>
              <p className="font-sans text-xs text-forest-400 uppercase">To</p>
              <p className="font-sans text-sm font-medium text-forest-900 mt-1">{moneyEvent.destinationCountry}</p>
            </div>
          </div>

          <p className="text-center font-sans text-sm text-forest-500 mt-6">
            Run the analysis via the MCP tool <code className="font-mono text-xs bg-cream-100 px-1 py-0.5 rounded">analyze_money_event</code> to see results here.
          </p>
        </div>
      </div>
    );
  }

  const result = mobilityResult;

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-forest-900 mb-1">Mobility Analysis</h2>
      <p className="font-sans text-sm text-forest-500 mb-6">
        {moneyEvent.type.replace('_', ' ')} — {moneyEvent.currency} {moneyEvent.amount.toLocaleString()} from {moneyEvent.sourceCountry} to {moneyEvent.destinationCountry}
      </p>

      {/* Status Determination */}
      <section className="mb-6">
        <h3 className="font-sans text-lg font-semibold text-forest-900 mb-3">Status Determination</h3>
        <CalloutBox variant="info">
          <p className="font-sans text-sm">
            <strong>{result.status.status.replace('_', ' ').toUpperCase()}</strong> in {result.status.sourceCountry} — {result.status.description}
          </p>
          <p className="font-mono text-xs text-forest-400 mt-1">
            Confidence: {result.status.confidence} | {result.status.citations.map((c) => c.reference).join('; ')}
          </p>
        </CalloutBox>
      </section>

      {/* Capital Controls */}
      <section className="mb-6">
        <h3 className="font-sans text-lg font-semibold text-forest-900 mb-3">Capital Controls</h3>
        {result.controls.hasControls ? (
          <CalloutBox variant="warning">
            <p className="font-sans text-sm font-medium">Capital controls apply in {moneyEvent.sourceCountry}</p>
            <ul className="mt-2 space-y-1">
              {result.controls.outboundLimits.map((l, i) => (
                <li key={i} className="font-sans text-xs text-forest-700">
                  - {l.name}: USD {l.annualLimitUSD?.toLocaleString() ?? 'N/A'}/year
                </li>
              ))}
            </ul>
            {result.controls.approvalRequired && (
              <p className="font-sans text-xs text-danger-600 mt-2 font-medium">
                Regulatory approval required for this amount
              </p>
            )}
          </CalloutBox>
        ) : (
          <CalloutBox variant="info">
            <p className="font-sans text-sm">No capital controls in {moneyEvent.sourceCountry}. Funds can move freely.</p>
          </CalloutBox>
        )}
      </section>

      {/* 5-Layer Cost Stack */}
      <section className="mb-6">
        <h3 className="font-sans text-lg font-semibold text-forest-900 mb-3">Cost Stack</h3>
        <CostStackCard taxLayers={result.taxLayers} />
      </section>

      {/* Repatriation Channels */}
      <section className="mb-6">
        <h3 className="font-sans text-lg font-semibold text-forest-900 mb-3">Repatriation Channels</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {result.channels.map((channel) => (
            <RepatriationChannelCard key={channel.id} channel={channel} />
          ))}
        </div>
      </section>

      {/* Permitted Actions Summary */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-sans text-lg font-semibold text-forest-900">Permitted Actions</h3>
          <button
            onClick={() => navigate('/actions')}
            className="px-3 py-1.5 bg-forest-100 text-forest-700 rounded-institutional text-xs font-medium hover:bg-forest-200 transition-colors"
          >
            View All Actions
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-cream-200 rounded-institutional p-4 text-center">
            <p className="font-mono text-2xl font-semibold text-forest-600">
              {result.permittedActions.filter((a) => a.permitted).length}
            </p>
            <p className="font-sans text-xs text-forest-400 mt-1">Permitted</p>
          </div>
          <div className="bg-white border border-cream-200 rounded-institutional p-4 text-center">
            <p className="font-mono text-2xl font-semibold text-danger-600">
              {result.permittedActions.filter((a) => !a.permitted).length}
            </p>
            <p className="font-sans text-xs text-forest-400 mt-1">Prohibited</p>
          </div>
          <div className="bg-white border border-cream-200 rounded-institutional p-4 text-center">
            <p className="font-mono text-2xl font-semibold text-forest-900">
              {result.permittedActions.length}
            </p>
            <p className="font-sans text-xs text-forest-400 mt-1">Total</p>
          </div>
        </div>
      </section>

      {/* Audit Trail */}
      <section>
        <h3 className="font-sans text-lg font-semibold text-forest-900 mb-3">Audit Trail</h3>
        <div className="bg-white border border-cream-200 rounded-institutional divide-y divide-cream-100">
          {result.auditTrail.map((entry, i) => (
            <div key={i} className="px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-forest-400">{entry.step}</span>
                <span className="font-mono text-xs text-cream-400">{entry.engineVersion}</span>
              </div>
              <p className="font-sans text-sm text-forest-700 mt-1">{entry.determination}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
