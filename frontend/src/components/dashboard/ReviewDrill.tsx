import { useState } from 'react';
import { Star } from 'lucide-react';
import type { Review, SentimentLabel } from '@/lib/types';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

type Filter = 'all' | SentimentLabel;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'negative', label: 'Negative' },
  { key: 'neutral', label: 'Neutral' },
  { key: 'positive', label: 'Positive' },
];

const toneMap: Record<SentimentLabel, 'positive' | 'neutral' | 'negative'> = {
  positive: 'positive',
  neutral: 'neutral',
  negative: 'negative',
};

/** Drill from aggregates down to the underlying reviews, filterable by sentiment. */
export default function ReviewDrill({ reviews }: { reviews: Review[] }) {
  const [filter, setFilter] = useState<Filter>('negative');
  const shown = reviews.filter((r) => filter === 'all' || r.sentimentLabel === filter);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
              filter === f.key ? 'bg-ink text-white' : 'bg-ink/[0.05] text-ink/60 hover:bg-ink/10',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <ul className="max-h-[420px] space-y-3 overflow-y-auto scroll-slim pr-1">
        {shown.map((r) => (
          <li key={r.id} className="rounded-xl border border-ink/[0.07] bg-white p-4">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold text-ink">{r.author}</span>
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'h-3.5 w-3.5',
                        i < r.rating ? 'fill-warning text-warning' : 'text-ink/15',
                      )}
                    />
                  ))}
                </span>
              </span>
              <Badge tone={toneMap[r.sentimentLabel]}>{r.sentimentLabel}</Badge>
            </div>
            <p className="text-sm leading-relaxed text-ink/70">{r.text}</p>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="py-8 text-center text-sm text-ink/40">No reviews in this segment.</li>
        )}
      </ul>
    </div>
  );
}
