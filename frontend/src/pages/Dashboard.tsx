import { useQuery } from '@tanstack/react-query';
import { MessageSquareReply, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getDashboard } from '@/lib/api';
import { useAppStore } from '@/store/appStore';
import { Card, CardHeader } from '@/components/ui/Card';
import StatTile from '@/components/ui/StatTile';
import Button from '@/components/ui/Button';
import PageHeader, { Loading } from '@/components/ui/PageHeader';
import SentimentTrendChart from '@/components/charts/SentimentTrendChart';
import SentimentDonut from '@/components/charts/SentimentDonut';
import ComplaintThemesBar from '@/components/charts/ComplaintThemesBar';
import ThemeList from '@/components/dashboard/ThemeList';
import KeywordChips from '@/components/dashboard/KeywordChips';
import ReviewDrill from '@/components/dashboard/ReviewDrill';
import { formatPct, formatSignedPct, sentimentTone } from '@/lib/utils';

export default function Dashboard() {
  const datasetId = useAppStore((s) => s.datasetId);
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', datasetId],
    queryFn: () => getDashboard(datasetId),
  });

  if (isLoading || !data) return <Loading />;

  const { kpis, trend, distribution, themes, keywords, reviews, dataset } = data;
  const tone = sentimentTone(kpis.netSentiment);

  return (
    <>
      <PageHeader
        eyebrow="Insights dashboard"
        title={dataset.productName}
        subtitle={`AI analysis of ${kpis.reviewsAnalyzed} customer reviews from ${dataset.name}.`}
        action={
          <Link to="/app/reply">
            <Button variant="dark">
              <MessageSquareReply className="h-4 w-4" /> Draft replies
            </Button>
          </Link>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile
          label="Reviews analyzed"
          value={kpis.reviewsAnalyzed.toString()}
          hint="This period"
        />
        <StatTile
          label="Net sentiment"
          value={formatSignedPct(kpis.netSentiment)}
          accent={tone.role}
          delta={{ value: '4 pts', positive: false }}
          hint={tone.label}
        />
        <StatTile
          label="Positive rate"
          value={formatPct(kpis.positiveRate)}
          accent="positive"
          hint={`Avg rating ${kpis.avgRating.toFixed(1)}★`}
        />
        <StatTile
          label="Complaint themes"
          value={kpis.complaintThemes.toString()}
          accent="negative"
          hint={`${kpis.responseOpportunities} replies to send`}
        />
      </div>

      {/* Trend + distribution */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Sentiment over time"
            subtitle="Weekly mix across the last 12 weeks — negativity climbs as packaging issues emerge."
          />
          <SentimentTrendChart data={trend} />
        </Card>
        <Card>
          <CardHeader title="Sentiment split" subtitle="This period" />
          <SentimentDonut data={distribution} />
        </Card>
      </div>

      {/* Complaint themes + strengths */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Top complaint themes"
            subtitle="Share of reviews per theme — bars past the 15% line trigger an alert."
          />
          <ComplaintThemesBar themes={themes} />
        </Card>
        <Card>
          <CardHeader title="Themes at a glance" subtitle="Complaints & strengths" />
          <ThemeList themes={themes} />
        </Card>
      </div>

      {/* Keywords + drill-through */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="High-frequency terms" subtitle="Sized by mentions, colored by sentiment" />
          <KeywordChips keywords={keywords} />
          <div className="mt-6 rounded-xl bg-brand-50/60 p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-700">
              <Sparkles className="h-4 w-4" /> AI takeaway
            </p>
            <p className="mt-1 text-sm text-ink/60">
              Packaging damage is your fastest-rising complaint. Fixing fulfillment could lift net
              sentiment by an estimated <span className="font-semibold text-ink">9 points</span>.
            </p>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader
            title="Review drill-through"
            subtitle="Read the real voices behind every metric"
          />
          <ReviewDrill reviews={reviews} />
        </Card>
      </div>
    </>
  );
}
