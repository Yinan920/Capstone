import type { TooltipProps } from 'recharts';

/** Shared, quiet tooltip: text in ink tokens, a color chip carries series identity. */
export default function ChartTooltip({
  active,
  payload,
  label,
  valueSuffix = '',
}: TooltipProps<number, string> & { valueSuffix?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-ink/10 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      {label != null && <p className="mb-1 font-semibold text-ink">{label}</p>}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-ink/60">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: entry.color }} />
              {entry.name}
            </span>
            <span className="font-semibold tabular-nums text-ink">
              {entry.value}
              {valueSuffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
