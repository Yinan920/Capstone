import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { getAlerts, markAlertRead, markAllAlertsRead } from '@/lib/api';
import type { FeedbackAlert } from '@/lib/types';
import { useAppStore } from '@/store/appStore';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import PageHeader, { Loading } from '@/components/ui/PageHeader';
import PremiumGate from '@/components/ui/PremiumGate';
import AlertCard from '@/components/alerts/AlertCard';

export default function Alerts() {
  const queryClient = useQueryClient();
  const datasetId = useAppStore((s) => s.datasetId);
  const { data: alerts, isLoading } = useQuery({ queryKey: ['alerts'], queryFn: getAlerts });

  const markOne = useMutation({
    mutationFn: markAlertRead,
    onSuccess: (updated) => {
      queryClient.setQueryData<FeedbackAlert[]>(['alerts'], (prev) =>
        prev?.map((a) => (a.id === updated.id ? updated : a)),
      );
    },
  });

  const markAll = useMutation({
    mutationFn: (scope?: string) => markAllAlertsRead(scope),
    onSuccess: (all) => queryClient.setQueryData<FeedbackAlert[]>(['alerts'], all),
  });

  // The whole feed is fetched, then narrowed to the selected upload — the page
  // used to show every dataset's alerts at once, so switching datasets changed
  // nothing here. Alerts on other uploads are counted, not hidden: a
  // notification you cannot see is worse than one in the wrong place.
  const mine = alerts?.filter((a) => a.datasetId === datasetId) ?? [];
  const elsewhere = (alerts?.length ?? 0) - mine.length;
  const unreadHere = mine.filter((a) => a.readAt === null).length;
  const unreadTotal = alerts?.filter((a) => a.readAt === null).length ?? 0;
  const unreadElsewhere = unreadTotal - unreadHere;

  return (
    <>
      <PageHeader
        eyebrow="Smart feedback alerts"
        title="Catch problems before they spread"
        subtitle="When a complaint theme crosses your risk threshold, the rule engine raises an alert here — with the reviews that triggered it."
        // The primary action is scoped to the dataset on screen: a button
        // sitting beside two alerts must not silently clear eighteen. Clearing
        // every upload is still available, but says so.
        action={
          unreadTotal > 0 ? (
            <div className="flex flex-col items-end gap-1.5">
              {unreadHere > 0 && (
                <Button
                  variant="outline"
                  onClick={() => markAll.mutate(datasetId)}
                  disabled={markAll.isPending}
                >
                  {markAll.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCheck className="h-4 w-4" />
                  )}
                  Mark {unreadHere === 1 ? 'this one' : `these ${unreadHere}`} as read
                </Button>
              )}
              {unreadElsewhere > 0 && (
                <button
                  type="button"
                  onClick={() => markAll.mutate(undefined)}
                  disabled={markAll.isPending}
                  className="text-xs font-medium text-ink/45 underline-offset-2 hover:text-ink hover:underline disabled:opacity-50"
                >
                  Mark all {unreadTotal} read across every upload
                </button>
              )}
            </div>
          ) : undefined
        }
      />
      <PremiumGate
        title="Smart alerts are a Premium feature"
        blurb="Get an alert the moment a complaint theme like ‘packaging damaged’ crosses your risk threshold."
      >
        {isLoading ? (
          <Loading label="Checking alert rules…" />
        ) : mine.length === 0 ? (
          <Card className="py-16 text-center">
            <Bell className="mx-auto h-12 w-12 text-ink/20" />
            <h2 className="mt-4 text-xl font-extrabold tracking-tight text-ink">
              No alerts for this dataset
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink/55">
              The rule engine runs after every analysis and raises an alert when a complaint theme
              crosses 15% of that upload's reviews.
              {elsewhere > 0 && (
                <>
                  {' '}
                  You have <span className="font-semibold text-ink">{elsewhere}</span> alert
                  {elsewhere === 1 ? '' : 's'} on your other uploads — switch dataset at the top of
                  the page to see them.
                </>
              )}
            </p>
            {elsewhere === 0 && (
              <Link to="/app/upload" className="mt-6 inline-block">
                <Button size="lg">Upload reviews</Button>
              </Link>
            )}
          </Card>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-ink/[0.07] bg-white px-4 py-3 text-sm text-ink/60">
              <Bell className="h-4 w-4 text-brand-500" />
              <span>
                <span className="font-semibold text-ink">
                  {mine.length} alert{mine.length === 1 ? '' : 's'} on this dataset
                </span>
                {unreadHere > 0 && (
                  <span className="font-semibold text-negative"> · {unreadHere} unread</span>
                )}
                {' '}· trigger at <span className="font-semibold text-ink">15% share</span>
                {/* Spelling out how many of the "elsewhere" alerts are unread is what
                    reconciles this line with the sidebar's global badge — without it
                    the two numbers just look like they disagree. */}
                {elsewhere > 0 && (
                  <>
                    {' '}· {elsewhere} more on your other uploads
                    {unreadElsewhere > 0 && `, ${unreadElsewhere} unread`}
                  </>
                )}
                .
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {mine.map((a) => (
                <AlertCard
                  key={a.id}
                  alert={a}
                  onMarkRead={markOne.mutate}
                  marking={markOne.isPending && markOne.variables === a.id}
                />
              ))}
            </div>
          </>
        )}
      </PremiumGate>
    </>
  );
}
