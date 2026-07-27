import { AlertTriangle, ThumbsUp, TrendingUp } from 'lucide-react';
import type { ThemeCluster } from '@/lib/types';
import { formatPct, formatSignedPct } from '@/lib/utils';

export default function ThemeList({ themes }: { themes: ThemeCluster[] }) {
  const ordered = themes
    .slice()
    .sort((a, b) => Number(b.isComplaint) - Number(a.isComplaint) || b.share - a.share);

  return (
    <ul className="divide-y divide-ink/[0.06]">
      {ordered.map((t) => (
        <li key={t.id} className="flex items-start gap-3 py-3.5">
          <span
            className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg"
            style={{
              background: t.isComplaint ? 'rgba(208,59,59,0.1)' : 'rgba(12,163,12,0.1)',
              color: t.isComplaint ? '#d03b3b' : '#0ca30c',
            }}
          >
            {t.isComplaint ? <AlertTriangle className="h-4 w-4" /> : <ThumbsUp className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-ink">{t.label}</p>
              <span className="shrink-0 text-sm font-bold tabular-nums text-ink/70">
                {formatPct(t.share)}
              </span>
            </div>
            <p className="mt-0.5 line-clamp-2 text-sm text-ink/55">{t.summary}</p>
            <div className="mt-1.5 flex items-center gap-3 text-xs text-ink/45">
              <span>{t.reviewCount} reviews</span>
              {t.isComplaint && t.trend > 0 && (
                <span className="inline-flex items-center gap-0.5 font-semibold text-negative">
                  <TrendingUp className="h-3 w-3" /> {formatSignedPct(t.trend)} vs prev
                </span>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
