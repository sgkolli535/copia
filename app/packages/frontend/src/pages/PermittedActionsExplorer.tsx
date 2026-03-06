import React, { useState } from 'react';
import { useAtomValue } from 'jotai';
import { useNavigate } from 'react-router-dom';
import { mobilityResultAtom } from '../store/atoms';
import PermittedActionRow from '../components/PermittedActionRow';
import type { ActionCategory } from '@copia/types';

type FilterStatus = 'all' | 'permitted' | 'prohibited';

export default function PermittedActionsExplorer() {
  const mobilityResult = useAtomValue(mobilityResultAtom);
  const navigate = useNavigate();
  const [filterCategory, setFilterCategory] = useState<ActionCategory | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  if (!mobilityResult) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-white border border-cream-200 rounded-institutional p-8 max-w-md">
          <p className="font-sans text-sm text-forest-600 mb-4">
            No mobility analysis results. Start by analyzing a money event.
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

  const actions = mobilityResult.permittedActions;
  const filtered = actions
    .filter((a) => filterCategory === 'all' || a.category === filterCategory)
    .filter((a) => filterStatus === 'all' || (filterStatus === 'permitted' ? a.permitted : !a.permitted));

  const categories: Array<{ value: ActionCategory | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'source_country', label: 'Source Country' },
    { value: 'destination_country', label: 'Destination' },
    { value: 'third_country', label: 'Third Country' },
  ];

  const statusFilters: Array<{ value: FilterStatus; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'permitted', label: 'Permitted' },
    { value: 'prohibited', label: 'Prohibited' },
  ];

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-forest-900 mb-1">Permitted Actions</h2>
      <p className="font-sans text-sm text-forest-500 mb-6">
        What you can and cannot do with funds from {mobilityResult.event.sourceCountry} — grouped by location.
      </p>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1">
          <span className="font-sans text-xs text-forest-500 mr-1">Category:</span>
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setFilterCategory(cat.value)}
              className={`px-2.5 py-1 rounded-institutional text-xs font-medium transition-colors ${
                filterCategory === cat.value
                  ? 'bg-forest-500 text-white'
                  : 'bg-cream-100 text-forest-600 hover:bg-cream-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <span className="font-sans text-xs text-forest-500 mr-1">Status:</span>
          {statusFilters.map((sf) => (
            <button
              key={sf.value}
              onClick={() => setFilterStatus(sf.value)}
              className={`px-2.5 py-1 rounded-institutional text-xs font-medium transition-colors ${
                filterStatus === sf.value
                  ? 'bg-forest-500 text-white'
                  : 'bg-cream-100 text-forest-600 hover:bg-cream-200'
              }`}
            >
              {sf.label}
            </button>
          ))}
        </div>

        <span className="font-mono text-xs text-forest-400 ml-auto">
          {filtered.length} of {actions.length} actions
        </span>
      </div>

      {/* Grouped action rows */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-cream-200 rounded-institutional p-6 text-center">
          <p className="font-sans text-sm text-forest-500">No actions match the current filters.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((action) => (
            <PermittedActionRow key={action.id} action={action} />
          ))}
        </div>
      )}
    </div>
  );
}
