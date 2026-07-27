import { Crown, Lock } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';

/**
 * Free ⇄ Premium demo switch. Drives feature-gating across the app so the video
 * can show locked vs unlocked premium panels live.
 */
export default function TierToggle({ className }: { className?: string }) {
  const tier = useAppStore((s) => s.tier);
  const setTier = useAppStore((s) => s.setTier);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-ink/10 bg-white p-1 text-sm font-semibold shadow-sm',
        className,
      )}
      role="tablist"
      aria-label="Plan tier"
    >
      <button
        role="tab"
        aria-selected={tier === 'free'}
        onClick={() => setTier('free')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors',
          tier === 'free' ? 'bg-ink text-white' : 'text-ink/55 hover:text-ink',
        )}
      >
        <Lock className="h-3.5 w-3.5" /> Free
      </button>
      <button
        role="tab"
        aria-selected={tier === 'premium'}
        onClick={() => setTier('premium')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors',
          tier === 'premium' ? 'bg-brand-grad text-white' : 'text-ink/55 hover:text-ink',
        )}
      >
        <Crown className="h-3.5 w-3.5" /> Premium
      </button>
    </div>
  );
}
