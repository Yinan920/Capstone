import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Star,
  Wand2,
} from 'lucide-react';
import { getDashboard, getReplyDraft } from '@/lib/api';
import { useAppStore } from '@/store/appStore';
import type { Review, SellerPortal } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PageHeader, { Loading } from '@/components/ui/PageHeader';
import PremiumGate from '@/components/ui/PremiumGate';
import { useCopy } from '@/lib/useCopy';
import { cn } from '@/lib/utils';

const PORTALS: { key: SellerPortal; label: string; url: string }[] = [
  { key: 'amazon', label: 'Amazon Seller Central', url: 'https://sellercentral.amazon.com/messaging' },
  { key: 'shopify', label: 'Shopify Admin', url: 'https://admin.shopify.com/reviews' },
  { key: 'tiktok', label: 'TikTok Shop', url: 'https://seller.tiktok.com/messages' },
];

export default function ReplyStudio() {
  const datasetId = useAppStore((s) => s.datasetId);
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', datasetId],
    queryFn: () => getDashboard(datasetId),
  });

  const negatives = (data?.reviews ?? []).filter((r) => r.sentimentLabel !== 'positive');
  const [selected, setSelected] = useState<Review | null>(null);

  useEffect(() => {
    if (negatives.length && !negatives.find((r) => r.id === selected?.id)) {
      setSelected(negatives[0]);
    }
  }, [negatives, selected]);

  return (
    <>
      <PageHeader
        eyebrow="Reply-draft optimizer"
        title="Turn a 1-star review into a saved customer"
        subtitle="AI writes an on-brand response for every complaint. Copy it, jump to your seller inbox, done in seconds."
      />
      <PremiumGate
        title="Reply Studio is a Premium feature"
        blurb="Generate brand-tone reply drafts for negative reviews and paste them straight into your seller portal."
      >
        {isLoading || !selected ? (
          <Loading label="Loading reviews…" />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            {/* Review queue */}
            <Card className="lg:col-span-2" padded={false}>
              <div className="border-b border-ink/[0.06] px-5 py-4">
                <p className="text-sm font-bold text-ink">Reviews needing a reply</p>
                <p className="text-xs text-ink/45">{negatives.length} negative & neutral reviews</p>
              </div>
              <ul className="max-h-[560px] space-y-1 overflow-y-auto scroll-slim p-2">
                {negatives.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => setSelected(r)}
                      className={cn(
                        'w-full rounded-xl px-3 py-3 text-left transition-colors',
                        selected.id === r.id ? 'bg-brand-50' : 'hover:bg-ink/[0.03]',
                      )}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-semibold text-ink">{r.author}</span>
                        <span className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                'h-3 w-3',
                                i < r.rating ? 'fill-warning text-warning' : 'text-ink/15',
                              )}
                            />
                          ))}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-xs text-ink/55">{r.text}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Draft editor */}
            <div className="lg:col-span-3">
              <DraftPanel review={selected} />
            </div>
          </div>
        )}
      </PremiumGate>
    </>
  );
}

function DraftPanel({ review }: { review: Review }) {
  const { copied, copy } = useCopy();
  const [body, setBody] = useState('');
  const { data: draft, isFetching, refetch } = useQuery({
    queryKey: ['reply', review.id],
    queryFn: () => getReplyDraft(review),
  });

  useEffect(() => {
    if (draft) setBody(draft.body);
  }, [draft]);

  return (
    <Card>
      {/* The review being answered */}
      <div className="rounded-xl border border-negative/20 bg-negative/[0.04] p-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="text-sm font-bold text-ink">{review.author}</span>
            <Badge tone="negative">{review.rating}★ · {review.sentimentLabel}</Badge>
          </span>
        </div>
        <p className="text-sm leading-relaxed text-ink/70">“{review.text}”</p>
      </div>

      {/* AI draft */}
      <div className="mt-4 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
          <Wand2 className="h-4 w-4 text-brand-500" /> AI reply draft
        </p>
        {draft && <Badge tone="brand"><Sparkles className="h-3 w-3" /> {draft.tone}</Badge>}
      </div>

      {isFetching ? (
        <div className="mt-2 grid h-40 place-items-center rounded-xl border border-dashed border-ink/15 text-sm text-ink/40">
          <span className="inline-flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" /> Generating on-brand reply…
          </span>
        </div>
      ) : (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          className="mt-2 w-full resize-y rounded-xl border border-ink/12 bg-white p-4 text-sm leading-relaxed text-ink/80 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant={copied ? 'signal' : 'primary'} onClick={() => copy(body)} disabled={isFetching}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied!' : 'Copy reply'}
        </Button>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} /> Regenerate
        </Button>
      </div>

      {/* Seller-portal deep links */}
      <div className="mt-5 border-t border-ink/[0.06] pt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/45">
          Paste it into your seller inbox
        </p>
        <div className="flex flex-wrap gap-2">
          {PORTALS.map((p) => (
            <a
              key={p.key}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink/12 bg-white px-3 py-2 text-sm font-semibold text-ink/70 transition-colors hover:border-brand-300 hover:text-brand-600"
            >
              {p.label} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ))}
        </div>
      </div>
    </Card>
  );
}
