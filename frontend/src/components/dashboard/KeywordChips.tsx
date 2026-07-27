import type { KeywordStat } from '@/lib/types';
import { SENTIMENT_COLOR } from '@/lib/chartColors';

/** Frequency-sized complaint/praise terms. Size encodes volume, color the sentiment. */
export default function KeywordChips({ keywords }: { keywords: KeywordStat[] }) {
  const max = Math.max(...keywords.map((k) => k.count));
  return (
    <div className="flex flex-wrap gap-2">
      {keywords
        .slice()
        .sort((a, b) => b.count - a.count)
        .map((k) => {
          const scale = 0.85 + (k.count / max) * 0.5;
          const color = SENTIMENT_COLOR[k.sentiment];
          return (
            <span
              key={k.term}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-semibold"
              style={{
                fontSize: `${scale}rem`,
                color,
                borderColor: `${color}33`,
                background: `${color}0f`,
              }}
              title={`${k.count} mentions · ${k.sentiment}`}
            >
              {k.term}
              <span className="text-[0.65em] font-bold opacity-60">{k.count}</span>
            </span>
          );
        })}
    </div>
  );
}
