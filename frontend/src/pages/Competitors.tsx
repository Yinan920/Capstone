import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Target, UploadCloud, XCircle } from 'lucide-react';
import { getCompetitorComparisons } from '@/lib/api';
import { useAppStore } from '@/store/appStore';
import Button from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import PageHeader, { Loading } from '@/components/ui/PageHeader';
import PremiumGate from '@/components/ui/PremiumGate';
import StatTile from '@/components/ui/StatTile';
import Badge from '@/components/ui/Badge';
import CompetitorRadar from '@/components/charts/CompetitorRadar';
import CompetitorBars from '@/components/charts/CompetitorBars';
import { CHART } from '@/lib/chartColors';
import { cn, formatPct, formatSignedPct } from '@/lib/utils';

export default function Competitors() {
  // datasetId is part of the key, not just the request: without it React Query
  // served the first dataset's comparison from cache forever and the dataset
  // switcher appeared to do nothing on this page.
  const datasetId = useAppStore((s) => s.datasetId);
  const { data, isLoading } = useQuery({
    queryKey: ['competitors', datasetId],
    queryFn: () => getCompetitorComparisons(datasetId),
  });
  const [idx, setIdx] = useState(0);

  return (
    <>
      <PageHeader
        eyebrow="Competitor benchmarking"
        title="You vs the competition"
        subtitle="See exactly where you win, where you're exposed, and how similar your feedback profiles are."
      />
      <PremiumGate
        title="Competitor benchmarking is a Premium feature"
        blurb="Compare your sentiment head-to-head with any rival listing and turn their weaknesses into your positioning."
      >
        {isLoading || !data ? (
          <Loading label="Comparing competitors…" />
        ) : data.length === 0 ? (
          <EmptyState />
        ) : (
          (() => {
            const cmp = data[Math.min(idx, data.length - 1)];
            return (
              <div>
                {/* Competitor toggle */}
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-sm font-medium text-ink/45">Compare against:</span>
                  {data.map((c, i) => (
                    <button
                      key={c.competitor.id}
                      onClick={() => setIdx(i)}
                      className={cn(
                        'rounded-full border px-4 py-1.5 text-sm font-semibold transition-all',
                        i === idx
                          ? 'border-transparent bg-ink text-white'
                          : 'border-ink/12 bg-white text-ink/60 hover:border-ink/25',
                      )}
                    >
                      {c.competitor.name}
                    </button>
                  ))}
                </div>

                {/* Head-to-head KPIs */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                  <StatTile
                    label="Your net sentiment"
                    value={formatSignedPct(cmp.you.netSentiment)}
                    accent="brand"
                    hint={`${cmp.you.reviewCount} reviews`}
                  />
                  <StatTile
                    label={`${cmp.competitor.name}`}
                    value={formatSignedPct(cmp.competitor.netSentiment)}
                    hint={`${cmp.competitor.reviewCount} reviews`}
                  />
                  <StatTile
                    label="Sentiment lead"
                    value={formatSignedPct(cmp.you.netSentiment - cmp.competitor.netSentiment)}
                    accent={cmp.you.netSentiment >= cmp.competitor.netSentiment ? 'positive' : 'negative'}
                    hint="Net vs rival"
                  />
                  <StatTile
                    label="Profile overlap"
                    value={formatPct(cmp.overlapScore)}
                    hint="How similar the feedback is"
                  />
                </div>

                {/* Radar + bars */}
                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader
                      title="Satisfaction by dimension"
                      subtitle="Overlap shows shared ground; gaps show your edge"
                      action={<Legend youName={cmp.you.name} competitorName={cmp.competitor.name} />}
                    />
                    <CompetitorRadar
                      axes={cmp.axes}
                      youName={cmp.you.name}
                      competitorName={cmp.competitor.name}
                    />
                  </Card>
                  <Card>
                    <CardHeader
                      title="Positive-sentiment share"
                      subtitle="Side-by-side, per theme"
                      action={<Legend youName={cmp.you.name} competitorName={cmp.competitor.name} />}
                    />
                    <CompetitorBars
                      data={cmp.sentimentSplit}
                      youName={cmp.you.name}
                      competitorName={cmp.competitor.name}
                    />
                  </Card>
                </div>

                {/* Advantages & gaps */}
                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader
                      title="Where you win"
                      action={<Badge tone="positive">Advantages</Badge>}
                    />
                    <ul className="space-y-3">
                      {cmp.advantages.map((a) => (
                        <li key={a} className="flex items-start gap-2.5 text-sm text-ink/75">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
                          {a}
                        </li>
                      ))}
                      {cmp.advantages.length === 0 && (
                        <li className="text-sm text-ink/45">
                          No dimension where you lead {cmp.competitor.name} by 5 points or more yet.
                        </li>
                      )}
                    </ul>
                  </Card>
                  <Card>
                    <CardHeader title="Where you're exposed" action={<Badge tone="negative">Gaps</Badge>} />
                    <ul className="space-y-3">
                      {cmp.gaps.map((g) => (
                        <li key={g} className="flex items-start gap-2.5 text-sm text-ink/75">
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-negative" />
                          {g}
                        </li>
                      ))}
                      {cmp.gaps.length === 0 && (
                        <li className="text-sm text-ink/45">
                          No dimension where {cmp.competitor.name} leads you by 5 points or more.
                        </li>
                      )}
                    </ul>
                    {/* Names the axis you actually trail on — gaps are ordered
                        by the comparison, so the first is the widest. */}
                    {cmp.gaps.length > 0 && (
                      <div className="mt-4 flex items-center gap-2 rounded-xl bg-brand-50/60 p-3 text-sm text-brand-700">
                        <Target className="h-4 w-4" />
                        <span className="font-medium">
                          Closing your widest gap — {cmp.gaps[0].toLowerCase()} — is what moves you
                          past {cmp.competitor.name} on overall sentiment.
                        </span>
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            );
          })()
        )}
      </PremiumGate>
    </>
  );
}

function Legend({ youName, competitorName }: { youName: string; competitorName: string }) {
  return (
    <div className="flex items-center gap-3 text-xs font-medium text-ink/60">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART.you }} /> {youName}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART.competitor }} />
        {competitorName}
      </span>
    </div>
  );
}

/** Benchmarking needs an analyzed dataset of your own to compare against — a
    freshly upgraded account has none yet. */
function EmptyState() {
  return (
    <Card className="py-16 text-center">
      <UploadCloud className="mx-auto h-12 w-12 text-ink/20" />
      <h2 className="mt-4 text-xl font-extrabold tracking-tight text-ink">
        Upload your reviews to compare
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink/55">
        Benchmarking scores your own feedback against rival listings across six dimensions — so we
        need at least one analyzed dataset from your store first.
      </p>
      <Link to="/app/upload" className="mt-6 inline-block">
        <Button size="lg">
          <UploadCloud className="h-4 w-4" /> Upload reviews
        </Button>
      </Link>
    </Card>
  );
}
