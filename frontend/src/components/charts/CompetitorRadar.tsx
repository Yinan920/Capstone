import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { CompetitorAxis } from '@/lib/types';
import { CHART } from '@/lib/chartColors';
import ChartTooltip from './ChartTooltip';

/** You vs competitor across satisfaction dimensions. Two categorical hues. */
export default function CompetitorRadar({
  axes,
  youName,
  competitorName,
}: {
  axes: CompetitorAxis[];
  youName: string;
  competitorName: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={axes} outerRadius="72%">
        <PolarGrid stroke={CHART.grid} />
        <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12, fill: '#52514e' }} />
        <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#a8a7a1' }} axisLine={false} />
        <Radar
          name={youName}
          dataKey="you"
          stroke={CHART.you}
          fill={CHART.you}
          fillOpacity={0.28}
          strokeWidth={2}
          isAnimationActive={false}
        />
        <Radar
          name={competitorName}
          dataKey="competitor"
          stroke={CHART.competitor}
          fill={CHART.competitor}
          fillOpacity={0.18}
          strokeWidth={2}
          isAnimationActive={false}
        />
        <Tooltip content={<ChartTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
