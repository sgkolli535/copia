import React, { useState } from 'react';
import type { AuditEntry } from '@copia/types';
import SourceCitation from './SourceCitation';

interface AuditTimelineProps {
  entries: AuditEntry[];
  className?: string;
}

interface TimelineEntryProps {
  entry: AuditEntry;
  isLast: boolean;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function formatStepName(step: string): string {
  return step
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function TimelineEntry({ entry, isLast }: TimelineEntryProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative flex gap-4">
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div className="w-3 h-3 rounded-full bg-forest-500 border-2 border-forest-300 flex-shrink-0 mt-1.5" />
        {!isLast && (
          <div className="w-0.5 bg-forest-200 flex-grow min-h-[24px]" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 pb-6 ${isLast ? 'pb-0' : ''}`}>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-sans font-semibold text-sm text-forest-800">
                {formatStepName(entry.step)}
              </span>
              <span className="font-mono text-xs text-forest-400">
                {formatTimestamp(entry.timestamp)}
              </span>
            </div>
            <svg
              className={[
                'w-4 h-4 text-forest-400 transition-transform duration-200',
                expanded ? 'rotate-180' : '',
              ].join(' ')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <p className="font-serif text-sm text-forest-600 mt-1 leading-relaxed">
            {entry.determination}
          </p>
        </button>

        {expanded && (
          <div className="mt-3 space-y-4 border-l-2 border-cream-200 pl-4 ml-1">
            {/* Inputs */}
            <div>
              <h5 className="font-sans text-xs uppercase tracking-wider text-forest-400 mb-1.5">
                Inputs
              </h5>
              <pre className="font-mono text-xs text-forest-700 bg-cream-100 rounded-institutional p-3 overflow-x-auto">
                {JSON.stringify(entry.inputs, null, 2)}
              </pre>
            </div>

            {/* Outputs */}
            <div>
              <h5 className="font-sans text-xs uppercase tracking-wider text-forest-400 mb-1.5">
                Outputs
              </h5>
              <pre className="font-mono text-xs text-forest-700 bg-cream-100 rounded-institutional p-3 overflow-x-auto">
                {JSON.stringify(entry.outputs, null, 2)}
              </pre>
            </div>

            {/* Citations */}
            {entry.citations.length > 0 && (
              <div>
                <h5 className="font-sans text-xs uppercase tracking-wider text-forest-400 mb-1.5">
                  Citations
                </h5>
                <div className="space-y-2">
                  {entry.citations.map((citation) => (
                    <SourceCitation key={citation.id} citation={citation} />
                  ))}
                </div>
              </div>
            )}

            {/* Engine Version */}
            <div className="flex items-center gap-4 text-xs font-mono text-forest-400">
              <span>Engine v{entry.engineVersion}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuditTimeline({ entries, className = '' }: AuditTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className={`text-center py-8 text-forest-400 font-sans text-sm ${className}`}>
        No audit entries available.
      </div>
    );
  }

  return (
    <div className={`space-y-0 ${className}`}>
      {entries.map((entry, index) => (
        <TimelineEntry
          key={`${entry.step}-${entry.timestamp}`}
          entry={entry}
          isLast={index === entries.length - 1}
        />
      ))}
    </div>
  );
}
