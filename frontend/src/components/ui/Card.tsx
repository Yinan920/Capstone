import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'article';
  padded?: boolean;
}

export function Card({ className, padded = true, as: Tag = 'div', ...props }: CardProps) {
  return (
    <Tag
      className={cn(
        'rounded-2xl border border-ink/[0.07] bg-surface-card shadow-card',
        padded && 'p-5 sm:p-6',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-4', className)}>
      <div>
        <h3 className="text-base font-bold tracking-tight text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-ink/55">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
