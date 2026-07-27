import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatTileProps {
  label: string;
  value: string;
  delta?: { value: string; positive: boolean };
  hint?: string;
  accent?: 'brand' | 'positive' | 'negative' | 'neutral';
}

const accents: Record<NonNullable<StatTileProps['accent']>, string> = {
  brand: 'text-brand-600',
  positive: 'text-positive',
  negative: 'text-negative',
  neutral: 'text-ink',
};

/** Compact KPI tile — big proportional figure, recessive label, optional delta. */
export default function StatTile({ label, value, delta, hint, accent = 'neutral' }: StatTileProps) {
  return (
    <div className="rounded-2xl border border-ink/[0.07] bg-surface-card p-5 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/45">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <span className={cn('text-3xl font-extrabold tracking-tight', accents[accent])}>{value}</span>
        {delta && (
          <span
            className={cn(
              'mb-1 inline-flex items-center gap-0.5 text-sm font-semibold',
              delta.positive ? 'text-positive' : 'text-negative',
            )}
          >
            {delta.positive ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : (
              <ArrowDownRight className="h-4 w-4" />
            )}
            {delta.value}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-ink/45">{hint}</p>}
    </div>
  );
}
