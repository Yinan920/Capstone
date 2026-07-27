import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Target, XCircle } from 'lucide-react';
import { getCompetitorComparisons } from '@/lib/api';
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
  const { data, isLoading } = useQuery({
    queryKey: ['competitors'],
    queryFn: getCompetitorComparisons,
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
        ) : (
          (() => {
            const cmp = data[idx];
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
                    </ul>
                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-brand-50/60 p-3 text-sm text-brand-700">
                      <Target className="h-4 w-4" />
                      <span className="font-medium">
                        Close the packaging gap to overtake {cmp.competitor.name} on overall sentiment.
                      </span>
                    </div>
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
