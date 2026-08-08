import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, BadgeCheck, Check, Crown, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { ApiError, downgradePlan, getPlans } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import PageHeader, { Loading } from '@/components/ui/PageHeader';
import { FormError } from '@/components/auth/AuthLayout';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import type { Plan } from '@/lib/types';

export default function Upgrade() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tier = useAppStore((s) => s.tier);
  const setTier = useAppStore((s) => s.setTier);
  const authUser = useAuthStore((s) => s.user);
  const [error, setError] = useState<string | null>(null);

  const [params] = useSearchParams();
  const justUpgraded = params.get('welcome') === '1' && tier === 'premium';

  const { data, isLoading } = useQuery({ queryKey: ['plans'], queryFn: getPlans });

  // Upgrading goes through the checkout page; only downgrade acts directly here.
  const mutation = useMutation({
    mutationFn: downgradePlan,
    onSuccess: (user) => {
      setError(null);
      setTier(user.tier);
      if (authUser) useAuthStore.setState({ user });
      queryClient.invalidateQueries();
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.'),
  });

  if (isLoading || !data) return <Loading label="Loading plans…" />;

  return (
    <>
      <PageHeader
        eyebrow="Plans & billing"
        title={tier === 'premium' ? 'You’re on Premium' : 'Unlock the full picture'}
        subtitle={
          tier === 'premium'
            ? 'Alerts, competitor benchmarking and reply drafts are active on your account.'
            : 'Free tells you what’s wrong. Premium tells you what to do about it.'
        }
      />

      {justUpgraded && (
        <div className="mx-auto mb-5 flex max-w-4xl items-center gap-3 rounded-2xl border border-positive/25 bg-positive/[0.07] p-4">
          <BadgeCheck className="h-5 w-5 shrink-0 text-positive" />
          <p className="text-sm text-ink/70">
            <strong className="text-ink">You’re on Premium.</strong> Alerts, competitor
            benchmarking and reply drafts are unlocked — they’re in the sidebar now.
          </p>
        </div>
      )}

      <div className="mx-auto grid max-w-4xl gap-4 lg:grid-cols-2">
        {data.plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            current={tier === plan.id}
            busy={mutation.isPending}
            onSelect={() =>
              plan.id === 'premium' ? navigate('/app/checkout') : mutation.mutate()
            }
          />
        ))}
      </div>

      <div className="mx-auto mt-5 max-w-4xl">
        <FormError message={error} />
      </div>

      {/* Honest note about the payment step — this is a real architectural
          position, not a disclaimer: keeping card data off our servers is the
          reason to use hosted checkout in the first place. */}
      <Card className="mx-auto mt-5 max-w-4xl border-dashed bg-surface">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
          <div className="text-sm text-ink/60">
            <p className="font-semibold text-ink">About the payment step</p>
            <p className="mt-1 leading-relaxed">
              Activating a plan here changes your account tier immediately — no card required.
              The production design routes payment through <strong>Stripe Checkout</strong>, a
              Stripe-hosted page that calls back to a webhook which performs exactly this tier
              change. Card details never touch our servers, which keeps SellerSense out of PCI
              DSS scope. Checkout is scheduled for a later milestone.
            </p>
          </div>
        </div>
      </Card>
    </>
  );
}

function PlanCard({
  plan,
  current,
  busy,
  onSelect,
}: {
  plan: Plan;
  current: boolean;
  busy: boolean;
  onSelect: () => void;
}) {
  const isPremium = plan.id === 'premium';

  return (
    <Card
      className={cn(
        'relative flex flex-col',
        isPremium && 'border-brand-200 shadow-glow',
        current && 'ring-2 ring-brand-500/30',
      )}
    >
      {current && (
        <span className="absolute right-5 top-5 rounded-full bg-ink px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          Current plan
        </span>
      )}

      <div className="flex items-center gap-2">
        {isPremium ? (
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-grad text-white">
            <Crown className="h-4 w-4" />
          </span>
        ) : (
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink/[0.06] text-ink/50">
            <Lock className="h-4 w-4" />
          </span>
        )}
        <h2 className="text-lg font-extrabold tracking-tight text-ink">{plan.name}</h2>
      </div>

      <p className="mt-4">
        <span className="text-4xl font-extrabold tracking-tight text-ink">
          ${plan.priceMonthly}
        </span>
        <span className="text-sm font-medium text-ink/45"> / month</span>
      </p>
      <p className="mt-1 text-sm text-ink/55">
        Up to <strong className="text-ink">{plan.reviewCap}</strong> reviews per upload
      </p>

      <ul className="mt-5 flex-1 space-y-2.5">
        {plan.features.map((f) => (
          <li key={f} className="flex gap-2.5 text-sm text-ink/70">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
            {f}
          </li>
        ))}
        {plan.locked.map((f) => (
          <li key={f} className="flex gap-2.5 text-sm text-ink/35">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      <div className="mt-6">
        {current ? (
          <Button variant="outline" size="lg" className="w-full" disabled>
            Your current plan
          </Button>
        ) : (
          <Button
            variant={isPremium ? 'primary' : 'outline'}
            size="lg"
            className="w-full"
            disabled={busy}
            onClick={onSelect}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Updating…
              </>
            ) : isPremium ? (
              <>
                <Crown className="h-4 w-4" /> Activate Premium <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              'Switch to Free'
            )}
          </Button>
        )}
      </div>
    </Card>
  );
}
