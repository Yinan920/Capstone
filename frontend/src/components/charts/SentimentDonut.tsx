import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { SentimentDistribution } from '@/lib/types';
import { CHART } from '@/lib/chartColors';
import ChartTooltip from './ChartTooltip';

/** Distribution donut with a hero net-positive figure in the middle. */
export default function SentimentDonut({ data }: { data: SentimentDistribution }) {
  const slices = [
    { name: 'Positive', value: data.positive, color: CHART.positive },
    { name: 'Neutral', value: data.neutral, color: CHART.neutral },
    { name: 'Negative', value: data.negative, color: CHART.negative },
  ];

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <div className="relative h-[168px] w-[168px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={2}
              stroke="#fff"
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
            >
              {slices.map((s) => (
                <Cell key={s.name} fill={s.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip valueSuffix="%" />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <span className="text-3xl font-extrabold tracking-tight text-ink">{data.positive}%</span>
          <span className="text-[11px] font-medium uppercase tracking-wide text-ink/45">Positive</span>
        </div>
      </div>
      <ul className="flex-1 space-y-2.5">
        {slices.map((s) => (
          <li key={s.name} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-ink/70">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
              {s.name}
            </span>
            <span className="font-semibold tabular-nums text-ink">{s.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
