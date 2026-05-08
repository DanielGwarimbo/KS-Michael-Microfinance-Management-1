import type { ReactNode } from 'react';
import { classNames } from '../../lib/utils';
import { ArrowUpRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: { value: number; label: string };
  color?: 'teal' | 'blue' | 'amber' | 'red' | 'green' | 'gray' | 'gold';
  onClick?: () => void;
}

const iconBg = {
  teal:  'from-brand-500 to-brand-700',
  blue:  'from-blue-500 to-blue-700',
  amber: 'from-amber-400 to-amber-600',
  red:   'from-red-500 to-red-700',
  green: 'from-emerald-500 to-emerald-700',
  gray:  'from-gray-400 to-gray-600',
  gold:  'from-gold-400 to-gold-600',
};

const accentBorder = {
  teal:  'border-t-brand-500',
  blue:  'border-t-blue-500',
  amber: 'border-t-amber-400',
  red:   'border-t-red-500',
  green: 'border-t-emerald-500',
  gray:  'border-t-gray-400',
  gold:  'border-t-gold-400',
};

export default function StatCard({ title, value, icon, trend, color = 'teal', onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={classNames(
        'bg-white rounded-2xl border border-gray-100 shadow-card hover:shadow-card-md transition-all duration-200 overflow-hidden group',
        'border-t-2', accentBorder[color],
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      )}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest font-display">{title}</p>
            <p className="mt-2 text-2xl font-extrabold text-gray-900 font-display leading-none tracking-tight">{value}</p>
            {trend && (
              <div className={classNames(
                'mt-2 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
                trend.value >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'
              )}>
                <span>{trend.value >= 0 ? '+' : ''}{trend.value}%</span>
                <span className="font-normal text-opacity-70">{trend.label}</span>
              </div>
            )}
          </div>
          <div className={classNames(
            'h-11 w-11 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-sm',
            iconBg[color]
          )}>
            <span className="text-white [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
          </div>
        </div>
        {onClick && (
          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-gray-400 group-hover:text-brand-600 transition-colors font-display">
            <span>View details</span>
            <ArrowUpRight className="h-3 w-3" />
          </div>
        )}
      </div>
    </div>
  );
}
