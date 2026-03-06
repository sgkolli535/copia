import React, { useRef, useCallback } from 'react';
import type { ConfidenceTier } from '@copia/types';
import { emitEvent } from '../store/analytics';

interface ConfidenceBadgeProps {
  tier: ConfidenceTier;
  context?: string;
  className?: string;
}

const tierConfig: Record<ConfidenceTier, { bg: string; text: string; label: string }> = {
  statutory: {
    bg: 'bg-forest-500',
    text: 'text-white',
    label: 'Statutory',
  },
  interpretive: {
    bg: 'bg-gold-400',
    text: 'text-forest-900',
    label: 'Interpretive',
  },
  advisory: {
    bg: 'bg-danger-500',
    text: 'text-white',
    label: 'Advisory',
  },
};

export default function ConfidenceBadge({ tier, context = '', className = '' }: ConfidenceBadgeProps) {
  const config = tierConfig[tier];
  const emittedRef = useRef(false);

  const handleClick = useCallback(() => {
    if (!emittedRef.current) {
      emittedRef.current = true;
      emitEvent({
        type: 'confidence_tier_viewed',
        tier,
        context,
        timestamp: new Date().toISOString(),
        sessionId: 'prototype',
      });
    }
  }, [tier, context]);

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
      title={`Confidence: ${config.label}`}
      className={[
        'inline-flex items-center px-2 py-0.5 cursor-pointer',
        'rounded-full font-mono text-xs uppercase tracking-wider font-medium',
        config.bg,
        config.text,
        className,
      ].join(' ')}
    >
      {config.label}
    </span>
  );
}
