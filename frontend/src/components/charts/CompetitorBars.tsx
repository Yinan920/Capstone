import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CompetitorComparison } from '@/lib/types';
import { CHART } from '@/lib/chartColors';
import ChartTooltip from './ChartTooltip';

/** Grouped bars: positive-sentiment share per dimension, you vs competitor. */
export default function CompetitorBars({
  data,
  youName,
  competitorName,
}: {
  data: CompetitorComparison['sentimentSplit'];
  youName: string;
  competitorName: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barGap={2}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={0} />
        <YAxis
          tickFormatter={(v) => `${v}%`}
          tickLine={false}
          axisLine={false}
          width={44}
          domain={[0, 100]}
        />
        <Tooltip cursor={{ fill: 'rgba(12,12,18,0.04)' }} content={<ChartTooltip valueSuffix="%" />} />
        <Bar
          dataKey="youPositive"
          name={youName}
          fill={CHART.you}
          radius={[4, 4, 0, 0]}
          maxBarSize={30}
          isAnimationActive={false}
        />
        <Bar
          dataKey="competitorPositive"
          name={competitorName}
          fill={CHART.competitor}
          radius={[4, 4, 0, 0]}
          maxBarSize={30}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
