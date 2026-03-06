import React from 'react';

type CalloutVariant = 'info' | 'warning' | 'conflict';

interface CalloutBoxProps {
  variant: CalloutVariant;
  title: string;
  children: React.ReactNode;
  className?: string;
}

const variantConfig: Record<CalloutVariant, {
  border: string;
  bg: string;
  iconColor: string;
  icon: React.ReactNode;
}> = {
  info: {
    border: 'border-l-forest-500',
    bg: 'bg-cream-100',
    iconColor: 'text-forest-500',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  warning: {
    border: 'border-l-gold-400',
    bg: 'bg-gold-50',
    iconColor: 'text-gold-500',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
        />
      </svg>
    ),
  },
  conflict: {
    border: 'border-l-danger-500',
    bg: 'bg-danger-50',
    iconColor: 'text-danger-500',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
};

export default function CalloutBox({ variant, title, children, className = '' }: CalloutBoxProps) {
  const config = variantConfig[variant];

  return (
    <div
      className={[
        'border-l-4 rounded-institutional p-4',
        config.border,
        config.bg,
        className,
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 mt-0.5 ${config.iconColor}`}>
          {config.icon}
        </div>
        <div className="min-w-0">
          <h4 className="font-sans font-semibold text-sm text-forest-900 mb-1">{title}</h4>
          <div className="font-serif text-sm text-forest-700 leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}
