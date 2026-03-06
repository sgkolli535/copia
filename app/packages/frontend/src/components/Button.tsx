import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'disabled';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-forest-500 text-white hover:bg-forest-600 active:bg-forest-700 border border-forest-500',
  secondary:
    'bg-transparent text-forest-500 border border-forest-500 hover:bg-forest-50 active:bg-forest-100',
  ghost:
    'bg-transparent text-forest-600 border-none underline underline-offset-2 hover:text-forest-800',
  disabled:
    'bg-gray-300 text-gray-500 border border-gray-300 cursor-not-allowed',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled = false,
  className = '',
  type = 'button',
}: ButtonProps) {
  const resolvedVariant = disabled ? 'disabled' : variant;

  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center font-sans font-medium',
        'rounded-institutional transition-colors duration-150',
        'focus:outline-none focus:ring-2 focus:ring-forest-300 focus:ring-offset-1',
        sizeClasses[size],
        variantClasses[resolvedVariant],
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}
