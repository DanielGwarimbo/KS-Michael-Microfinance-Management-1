import type { ReactNode } from 'react';
import { classNames } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: { value: number; label: string };
  color?: 'teal' | 'blue' | 'amber' | 'red' | 'green' | 'gray';
  onClick?: () => void;
}

const colorClasses = {
  teal: 'bg-teal-50 text-teal-600',
  blue: 'bg-blue-50 text-blue-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  green: 'bg-green-50 text-green-600',
  gray: 'bg-gray-50 text-gray-600',
};

export default function StatCard({ title, value, icon, trend, color = 'teal', onClick }: StatCardProps) {
  return (
    <div
      className={classNames('bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow', onClick ? 'cursor-pointer' : '')}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className={classNames('mt-1 text-xs font-medium', trend.value >= 0 ? 'text-green-600' : 'text-red-600')}>
              {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div className={classNames('p-3 rounded-lg', colorClasses[color])}>
          {icon}
        </div>
      </div>
    </div>
  );
}
