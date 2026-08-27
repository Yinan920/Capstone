import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, MessageSquareReply, Sparkles, UploadCloud } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ApiError, getDashboard, getDatasets } from '@/lib/api';
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
import DeleteDataset from '@/components/dashboard/DeleteDataset';
import DuplicateReviews from '@/components/dashboard/DuplicateReviews';
import { formatPct, formatSignedPct, sentimentTone } from '@/lib/utils';

export default function Dashboard() {
  const datasetId = useAppStore((s) => s.datasetId);
  const { data: datasets, isLoading: datasetsLoading } = useQuery({
    queryKey: ['datasets'],
    queryFn: getDatasets,
  });
  const hasDataset = !!datasets?.some((d) => d.id === datasetId);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', datasetId],
    queryFn: () => getDashboard(datasetId),
    enabled: hasDataset,
  });

  // 409 = analysis still running server-side; poll until it finishes.
  const analysisRunning = error instanceof ApiError && error.status === 409;
  useEffect(() => {
    if (!analysisRunning) return;
    const timer = setTimeout(() => refetch(), 2000);
    return () => clearTimeout(timer);
  }, [analysisRunning, error, refetch]);

  if (!datasetsLoading && datasets?.length === 0) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <UploadCloud className="mx-auto h-12 w-12 text-ink/20" />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">No reviews yet</h1>
        <p className="mt-2 text-sm text-ink/55">
          Upload your first CSV of customer reviews and the AI will build this dashboard for you.
        </p>
        <Link to="/app/upload" className="mt-6 inline-block">
          <Button size="lg">
            <UploadCloud className="h-4 w-4" /> Upload reviews
          </Button>
        </Link>
      </div>
    );
  }

  if (analysisRunning) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-500" />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">Analysis in progress</h1>
        <p className="mt-2 text-sm text-ink/55">
          The AI is still scoring this dataset — this page will refresh automatically.
        </p>
      </div>
    );
  }

  if (isLoading || datasetsLoading || !data) return <Loading />;

  const { kpis, trend, distribution, themes, keywords, reviews, dataset } = data;
  const tone = sentimentTone(kpis.netSentiment);

  return (
    <>
      <PageHeader
        eyebrow="Insights dashboard"
        title={dataset.productName}
        subtitle={`AI analysis of ${kpis.reviewsAnalyzed} customer reviews from ${dataset.name}.`}
        action={
          <div className="flex items-center gap-2">
            <DeleteDataset dataset={dataset} />
            <Link to="/app/reply">
              <Button variant="dark">
                <MessageSquareReply className="h-4 w-4" /> Draft replies
              </Button>
            </Link>
          </div>
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
          // Only shown when the dataset spans enough weeks to have a trend.
          delta={
            kpis.netSentimentDelta === null || kpis.netSentimentDelta === 0
              ? undefined
              : {
                  value: `${Math.abs(kpis.netSentimentDelta)} pts`,
                  positive: kpis.netSentimentDelta > 0,
                }
          }
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
            subtitle={`Weekly mix across ${trend.length} week${trend.length === 1 ? '' : 's'} of reviews.`}
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
          {/* Written by the model from this dataset's own themes during analysis.
              Absent for datasets analysed before the feature shipped. */}
          {dataset.takeaway && (
            <div className="mt-6 rounded-xl bg-brand-50/60 p-4">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                <Sparkles className="h-4 w-4" /> AI takeaway
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink/60">{dataset.takeaway}</p>
            </div>
          )}
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader
            title="Review drill-through"
            subtitle="Read the real voices behind every metric"
          />
          <ReviewDrill reviews={reviews} />
        </Card>
      </div>

      {/* Data-integrity check, below the analysis it qualifies. */}
      <div className="mt-4">
        <DuplicateReviews datasetId={dataset.id} />
      </div>
    </>
  );
}
