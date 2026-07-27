import { Bell, Clock, Mail, MailX, TrendingUp } from 'lucide-react';
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

export default function AlertCard({ alert }: { alert: FeedbackAlert }) {
  const color = SEVERITY_COLOR[alert.severity];
  const overBy = alert.share - alert.threshold;
  const barPct = Math.min(100, (alert.share / (alert.threshold * 1.8)) * 100);
  const thresholdPct = Math.min(100, (alert.threshold / (alert.threshold * 1.8)) * 100);

  return (
    <div
      className={cn(
        'rounded-2xl border bg-surface-card p-5 shadow-card transition-shadow hover:shadow-lift',
        alert.isNew && 'animate-fade-up ring-2 ring-negative/30',
      )}
      style={{ borderColor: `${color}33` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn('grid h-10 w-10 place-items-center rounded-xl', alert.isNew && 'animate-pulse-ring')}
            style={{ background: `${color}18`, color }}
          >
            <Bell className="h-5 w-5" />
          </span>
          <div>
            <p className="font-bold text-ink">{alert.theme}</p>
            <p className="text-xs text-ink/45">
              Detected in the last {alert.windowDays} days · {alert.sampleReviews.length} sample reviews
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
            {formatPct(alert.share)} of recent reviews
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-negative">
            <TrendingUp className="h-3.5 w-3.5" />
            {formatPct(overBy)} over threshold
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
          <span>was {formatPct(alert.previousShare)}</span>
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
        {alert.emailSentTo ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-positive">
            <Mail className="h-3.5 w-3.5" /> Email sent to {alert.emailSentTo}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 font-medium text-ink/45">
            <MailX className="h-3.5 w-3.5" /> Below email trigger
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-ink/40">
          <Clock className="h-3.5 w-3.5" /> {timeAgo(alert.triggeredAt)}
        </span>
      </div>
    </div>
  );
}
