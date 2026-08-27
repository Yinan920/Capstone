import { useQuery } from '@tanstack/react-query';
import { CopyCheck, ShieldCheck, Star } from 'lucide-react';
import { getNearDuplicates } from '@/lib/api';
import { Card, CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

/**
 * Reviews with near-identical wording, found by cosine distance over the stored
 * embeddings. Templated reviews are reworded rather than copied, so this is a
 * vector question, not a string one.
 *
 * Fetched separately from the dashboard: the search is quadratic in the dataset,
 * and the page that loads on every visit should not pay for it.
 */
export default function DuplicateReviews({ datasetId }: { datasetId: string }) {
  const { data: groups, isLoading } = useQuery({
    queryKey: ['duplicates', datasetId],
    queryFn: () => getNearDuplicates(datasetId),
  });

  const flagged = groups?.reduce((n, g) => n + g.size, 0) ?? 0;

  return (
    <Card>
      <CardHeader
        title="Near-duplicate reviews"
        subtitle="Near-identical wording across different reviewers — a templated-review signal"
        action={
          groups?.length ? (
            <Badge tone="negative">{flagged} flagged</Badge>
          ) : (
            <Badge tone="positive">Clean</Badge>
          )
        }
      />

      {isLoading ? (
        <p className="py-8 text-center text-sm text-ink/40">Comparing review embeddings…</p>
      ) : !groups?.length ? (
        <div className="flex items-center gap-3 rounded-xl bg-positive/[0.06] p-4">
          <ShieldCheck className="h-5 w-5 shrink-0 text-positive" />
          <p className="text-sm text-ink/65">
            No near-duplicates found. Every review in this dataset is worded independently.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group, i) => (
            <div key={i} className="rounded-xl border border-negative/20 bg-negative/[0.03] p-4">
              <div className="mb-2.5 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
                  <CopyCheck className="h-4 w-4 text-negative" />
                  {group.size} reviews share the same wording
                </p>
                <span className="text-xs font-semibold text-ink/45">
                  {Math.round(group.maxSimilarity * 100)}% similar
                </span>
              </div>
              <ul className="space-y-1.5">
                {group.reviews.map((r) => (
                  <li key={r.id} className="rounded-lg bg-white/70 px-3 py-2">
                    <div className="mb-0.5 flex items-center gap-2">
                      <span className="text-xs font-semibold text-ink">{r.author}</span>
                      <span className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star
                            key={j}
                            className={cn(
                              'h-2.5 w-2.5',
                              j < r.rating ? 'fill-warning text-warning' : 'text-ink/15',
                            )}
                          />
                        ))}
                      </span>
                    </div>
                    <p className="text-xs italic text-ink/60">“{r.text}”</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="text-xs leading-relaxed text-ink/45">
            Shared wording is a signal, not a verdict — genuine customers sometimes phrase
            complaints alike. Read the group before acting on it.
          </p>
        </div>
      )}
    </Card>
  );
}
