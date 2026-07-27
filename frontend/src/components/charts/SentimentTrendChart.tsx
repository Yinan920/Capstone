import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SentimentPoint } from '@/lib/types';
import { CHART } from '@/lib/chartColors';
import ChartTooltip from './ChartTooltip';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Stacked-area sentiment mix over 12 weeks. Status colors; recessive chrome. */
export default function SentimentTrendChart({ data }: { data: SentimentPoint[] }) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={264}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} stackOffset="expand">
          <defs>
            {(['positive', 'neutral', 'negative'] as const).map((k) => (
              <linearGradient id={`g-${k}`} key={k} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART[k]} stopOpacity={0.55} />
                <stop offset="100%" stopColor={CHART[k]} stopOpacity={0.12} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="date" tickFormatter={fmtDate} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis
            tickFormatter={(v) => `${Math.round(v * 100)}%`}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip content={<ChartTooltip valueSuffix="%" />} />
          <Area
            type="monotone"
            dataKey="negative"
            name="Negative"
            stackId="1"
            stroke={CHART.negative}
            strokeWidth={2}
            fill="url(#g-negative)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="neutral"
            name="Neutral"
            stackId="1"
            stroke={CHART.neutral}
            strokeWidth={2}
            fill="url(#g-neutral)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="positive"
            name="Positive"
            stackId="1"
            stroke={CHART.positive}
            strokeWidth={2}
            fill="url(#g-positive)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <Legend />
    </div>
  );
}

function Legend() {
  const items: { label: string; color: string }[] = [
    { label: 'Positive', color: CHART.positive },
    { label: 'Neutral', color: CHART.neutral },
    { label: 'Negative', color: CHART.negative },
  ];
  return (
    <div className="mt-3 flex flex-wrap items-center gap-4">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5 text-xs font-medium text-ink/60">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: it.color }} /> {it.label}
        </span>
      ))}
    </div>
  );
}
