import { Crown, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { USE_MOCKS } from '@/lib/config';
import Button from './Button';

/**
 * Wraps a premium feature. On the Free tier it renders the real panel blurred
 * behind an upgrade overlay; on Premium it renders children directly. This is the
 * visual proof of feature-gating for the demo.
 */
export default function PremiumGate({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb: string;
  children: ReactNode;
}) {
  const tier = useAppStore((s) => s.tier);
  const setTier = useAppStore((s) => s.setTier);

  if (tier === 'premium') return <>{children}</>;

  return (
    // The overlay is absolutely positioned, so the container's height comes from
    // the blurred children behind it. For a free user those children are an
    // empty/loading state (the premium API returns 402), which is shorter than
    // the upgrade card — without a floor, overflow-hidden clips the card.
    <div className="relative min-h-[26rem] overflow-hidden rounded-3xl">
      <div className="pointer-events-none select-none blur-[6px] saturate-[0.7] opacity-60" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-white/40 to-white/85 p-6">
        <div className="max-w-md rounded-3xl border border-brand-100 bg-white/90 p-8 text-center shadow-glow backdrop-blur">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand-grad text-white">
            <Crown className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-extrabold tracking-tight text-ink">{title}</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink/60">{blurb}</p>
          {USE_MOCKS ? (
            <>
              <Button variant="primary" className="mt-5" onClick={() => setTier('premium')}>
                <Sparkles className="h-4 w-4" /> Unlock with Premium
              </Button>
              <p className="mt-3 text-xs text-ink/40">Demo: switch the plan toggle to preview instantly.</p>
            </>
          ) : (
            <>
              <Link to="/app/upgrade">
                <Button variant="primary" className="mt-5">
                  <Sparkles className="h-4 w-4" /> Upgrade to Premium
                </Button>
              </Link>
              <p className="mt-3 text-xs text-ink/40">
                Your account is on the Free plan — the API enforces this with a real 402.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
