import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ThemeCluster } from '@/lib/types';
import { CHART } from '@/lib/chartColors';
import ChartTooltip from './ChartTooltip';

/**
 * Horizontal complaint-share bars with the 15% alert threshold marked. A single
 * measure (share of reviews) → one hue; bars crossing the threshold turn red to
 * flag alert-worthy themes (secondary encoding backed by the direct % label).
 */
export default function ComplaintThemesBar({
  themes,
  threshold = 0.15,
}: {
  themes: ThemeCluster[];
  threshold?: number;
}) {
  const data = themes
    .filter((t) => t.isComplaint)
    .sort((a, b) => b.share - a.share)
    .map((t) => ({ label: t.label, share: Math.round(t.share * 100), over: t.share >= threshold }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 54)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 44, left: 8, bottom: 4 }}>
        <XAxis type="number" hide domain={[0, Math.max(30, ...data.map((d) => d.share + 6))]} />
        <YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          width={130}
          tick={{ fontSize: 12, fill: '#52514e' }}
        />
        <Tooltip cursor={{ fill: 'rgba(12,12,18,0.04)' }} content={<ChartTooltip valueSuffix="%" />} />
        <ReferenceLine
          x={threshold * 100}
          stroke={CHART.negative}
          strokeDasharray="4 4"
          label={{ value: 'Alert 15%', position: 'top', fill: CHART.negative, fontSize: 11 }}
        />
        <Bar
          dataKey="share"
          name="Share of reviews"
          radius={[4, 4, 4, 4]}
          barSize={22}
          isAnimationActive={false}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.over ? CHART.negative : CHART.seq[400]} />
          ))}
          <LabelList
            dataKey="share"
            position="right"
            formatter={(v: number) => `${v}%`}
            style={{ fontSize: 12, fontWeight: 700, fill: '#0b0b0b' }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
