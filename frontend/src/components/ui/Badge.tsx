import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'positive' | 'negative' | 'warning' | 'brand' | 'signal';

const tones: Record<Tone, string> = {
  neutral: 'bg-ink/[0.06] text-ink/70',
  positive: 'bg-positive/10 text-positive',
  negative: 'bg-negative/10 text-negative',
  warning: 'bg-warning/15 text-[#9a6a00]',
  brand: 'bg-brand-50 text-brand-600',
  signal: 'bg-signal/25 text-signal-ink',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export default function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
