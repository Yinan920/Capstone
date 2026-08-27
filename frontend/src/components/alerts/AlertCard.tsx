import { Bell, CheckCheck, Clock, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { FeedbackAlert } from '@/lib/types';
import { SEVERITY_COLOR } from '@/lib/chartColors';
import { cn, formatPct } from '@/lib/utils';

const SEVERITY_LABEL: Record<FeedbackAlert['severity'], string> = {
  warning: 'Warning',
  serious: 'Serious',
  critical: 'Critical',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.round(diff / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function AlertCard({
  alert,
  onMarkRead,
  marking = false,
}: {
  alert: FeedbackAlert;
  onMarkRead?: (id: string) => void;
  marking?: boolean;
}) {
  const color = SEVERITY_COLOR[alert.severity];
  const unread = alert.readAt === null;
  const overBy = alert.share - alert.threshold;
  const barPct = Math.min(100, (alert.share / (alert.threshold * 1.8)) * 100);
  const thresholdPct = Math.min(100, (alert.threshold / (alert.threshold * 1.8)) * 100);
  // Direction is share vs its earlier value, which is a different question from
  // "how far over the threshold". Rendering the excess with a fixed up-arrow
  // showed a shrinking theme as rising, so the two are now separated.
  const movement = alert.share - alert.previousShare;
  const rising = movement > 0.005;
  const falling = movement < -0.005;
  const Trend = rising ? TrendingUp : falling ? TrendingDown : Minus;

  return (
    <div
      className={cn(
        'rounded-2xl border bg-surface-card p-5 shadow-card transition-shadow hover:shadow-lift',
        unread && 'ring-2 ring-negative/30',
      )}
      style={{ borderColor: `${color}33` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="grid h-10 w-10 place-items-center rounded-xl"
            style={{ background: `${color}18`, color }}
          >
            <Bell className="h-5 w-5" />
          </span>
          <div>
            <p className="font-bold text-ink">{alert.theme}</p>
            <p className="text-xs text-ink/45">
              {alert.sampleReviews.length} sample review
              {alert.sampleReviews.length === 1 ? '' : 's'} from this dataset
            </p>
          </div>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide"
          style={{ background: `${color}18`, color }}
        >
          {SEVERITY_LABEL[alert.severity]}
        </span>
      </div>

      {/* Threshold meter */}
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-semibold text-ink">
            {formatPct(alert.share)} of this dataset
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1 font-semibold',
              rising ? 'text-negative' : falling ? 'text-positive' : 'text-ink/45',
            )}
          >
            <Trend className="h-3.5 w-3.5" />
            {rising ? 'rising' : falling ? 'easing' : 'flat'} · {formatPct(overBy)} over threshold
          </span>
        </div>
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-ink/[0.06]">
          <div className="h-full rounded-full" style={{ width: `${barPct}%`, background: color }} />
          <div
            className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2"
            style={{ left: `${thresholdPct}%`, background: '#0b0b0b' }}
            title={`Threshold ${formatPct(alert.threshold)}`}
          />
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-ink/40">
          {/* previousShare is this theme's share across the earlier half of the
              upload, not a reading from some previous week — labelled for what
              it actually measures. */}
          <span>{formatPct(alert.previousShare)} earlier in this upload</span>
          <span>threshold {formatPct(alert.threshold)}</span>
        </div>
      </div>

      {/* Sample reviews */}
      <ul className="mt-4 space-y-1.5">
        {alert.sampleReviews.slice(0, 2).map((r, i) => (
          <li key={i} className="rounded-lg bg-ink/[0.03] px-3 py-2 text-xs italic text-ink/60">
            “{r}”
          </li>
        ))}
      </ul>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-ink/[0.06] pt-3 text-xs">
        {unread ? (
          <button
            type="button"
            onClick={() => onMarkRead?.(alert.id)}
            disabled={marking || !onMarkRead}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold text-negative transition-colors hover:bg-negative/[0.08] disabled:opacity-50"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-negative" /> Unread — mark as read
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 font-medium text-ink/45">
            <CheckCheck className="h-3.5 w-3.5" /> Read {timeAgo(alert.readAt!)}
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-ink/40">
          <Clock className="h-3.5 w-3.5" /> {timeAgo(alert.triggeredAt)}
        </span>
      </div>
    </div>
  );
}
