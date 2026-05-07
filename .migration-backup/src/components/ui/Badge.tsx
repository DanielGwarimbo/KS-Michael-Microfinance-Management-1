import { classNames } from '../../lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  colorClass?: string;
  className?: string;
}

export default function Badge({ children, colorClass = 'bg-gray-100 text-gray-800', className }: BadgeProps) {
  return (
    <span
      className={classNames(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        colorClass,
        className
      )}
    >
      {children}
    </span>
  );
}
