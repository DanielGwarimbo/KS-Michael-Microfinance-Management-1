import { classNames } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export default function Card({ children, className, padding = true }: CardProps) {
  return (
    <div
      className={classNames(
        'bg-white rounded-2xl border border-gray-100 shadow-card',
        padding && 'p-6',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={classNames('mb-5', className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={classNames('font-display text-[15px] font-bold text-gray-900 tracking-tight', className)}>
      {children}
    </h3>
  );
}
