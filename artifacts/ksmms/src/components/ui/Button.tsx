import { type ButtonHTMLAttributes } from 'react';
import { classNames } from '../../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variants = {
  primary:   'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 focus:ring-brand-500 shadow-sm hover:shadow',
  secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-200 focus:ring-gray-300',
  danger:    'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 focus:ring-red-400 shadow-sm',
  ghost:     'text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-300',
  outline:   'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 focus:ring-brand-500',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-[13px] gap-2',
  lg: 'px-5 py-3 text-sm gap-2',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={classNames(
        'inline-flex items-center justify-center font-display font-600 rounded-xl transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-3.5 w-3.5 opacity-70" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
