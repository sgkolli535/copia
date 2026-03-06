import React, { useState, useRef, useEffect } from 'react';
import type { SourceCitation as SourceCitationType } from '@copia/types';
import ConfidenceBadge from './ConfidenceBadge';
import { emitEvent } from '../store/analytics';

interface SourceCitationProps {
  citation: SourceCitationType;
  className?: string;
}

export default function SourceCitation({ citation, className = '' }: SourceCitationProps) {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [expanded]);

  const sourceTypeLabels: Record<string, string> = {
    statute: 'Statute',
    regulation: 'Regulation',
    treaty: 'Treaty',
    guidance: 'Guidance',
    case_law: 'Case Law',
    commentary: 'Commentary',
  };

  return (
    <div
      className={[
        'border-l-4 border-gold-400 bg-cream-50 rounded-institutional',
        'transition-all duration-200',
        className,
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => {
          if (!expanded) {
            emitEvent({
              type: 'citation_expanded',
              citationId: citation.id,
              sourceType: citation.sourceType,
              timestamp: new Date().toISOString(),
              sessionId: 'prototype',
            });
          }
          setExpanded(!expanded);
        }}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-cream-100 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono text-sm text-forest-700 truncate">
            {citation.reference}
          </span>
          <span className="text-sm text-forest-500 truncate hidden sm:inline">
            {citation.title}
          </span>
        </div>
        <svg
          className={[
            'w-4 h-4 text-forest-500 flex-shrink-0 transition-transform duration-200',
            expanded ? 'rotate-180' : '',
          ].join(' ')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        style={{ maxHeight: expanded ? `${contentHeight}px` : '0px' }}
        className="overflow-hidden transition-all duration-300 ease-in-out"
      >
        <div ref={contentRef} className="px-4 pb-4 pt-1 space-y-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-forest-500 font-sans text-xs uppercase tracking-wide">
                Source Type
              </span>
              <p className="font-sans text-forest-800 mt-0.5">
                {sourceTypeLabels[citation.sourceType] ?? citation.sourceType}
              </p>
            </div>
            <div>
              <span className="text-forest-500 font-sans text-xs uppercase tracking-wide">
                Jurisdiction
              </span>
              <p className="font-sans text-forest-800 mt-0.5">{citation.jurisdiction}</p>
            </div>
            <div className="col-span-2">
              <span className="text-forest-500 font-sans text-xs uppercase tracking-wide">
                Title
              </span>
              <p className="font-serif text-forest-800 mt-0.5">{citation.title}</p>
            </div>
            <div>
              <span className="text-forest-500 font-sans text-xs uppercase tracking-wide">
                Reference
              </span>
              <p className="font-mono text-forest-800 mt-0.5 text-sm">{citation.reference}</p>
            </div>
            <div>
              <span className="text-forest-500 font-sans text-xs uppercase tracking-wide">
                As Of Date
              </span>
              <p className="font-sans text-forest-800 mt-0.5">{citation.asOfDate}</p>
            </div>
            {citation.url && (
              <div className="col-span-2">
                <span className="text-forest-500 font-sans text-xs uppercase tracking-wide">
                  URL
                </span>
                <p className="mt-0.5">
                  <a
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm text-forest-600 underline underline-offset-2 hover:text-forest-800"
                  >
                    {citation.url}
                  </a>
                </p>
              </div>
            )}
            <div>
              <span className="text-forest-500 font-sans text-xs uppercase tracking-wide">
                Confidence
              </span>
              <div className="mt-1">
                <ConfidenceBadge tier={citation.confidence} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
