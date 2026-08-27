import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BadgeCheck, Check, Crown, Loader2 } from 'lucide-react';
import { ApiError, getPlans, upgradePlan } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Loading } from '@/components/ui/PageHeader';
import { FormError } from '@/components/auth/AuthLayout';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';

export default function Checkout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setTier = useAppStore((s) => s.setTier);
  const authUser = useAuthStore((s) => s.user);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['plans'], queryFn: getPlans });
  const premium = data?.plans.find((p) => p.id === 'premium');

  const mutation = useMutation({
    mutationFn: upgradePlan,
    onSuccess: (user) => {
      setTier(user.tier);
      if (authUser) useAuthStore.setState({ user });
      queryClient.invalidateQueries();
      navigate('/app/upgrade?welcome=1');
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.'),
  });

  if (isLoading || !premium) return <Loading label="Loading plan…" />;

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/app/upgrade"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink/50 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to plans
      </Link>

      <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
        Confirm your upgrade
      </h1>
      <p className="mt-1 text-sm text-ink/55">
        Activating SellerSense {premium.name} unlocks alerts, competitor benchmarking and reply
        drafts on your account.
      </p>

      {/* Stated plainly rather than buried: there is no payment step here at all. */}
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/[0.07] p-4">
        <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <p className="text-sm leading-relaxed text-ink/70">
          <strong className="text-ink">No payment is collected.</strong> This project implements
          plan entitlement — the tier change and the API-side gating that enforces it — but not
          billing. A production build would hand off to a hosted checkout provider, which calls
          back to a webhook performing exactly the tier change below, so card data never reaches
          this server.
        </p>
      </div>

      <Card className="mt-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/45">What you get</h2>

        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-sm font-semibold text-ink">SellerSense {premium.name}</span>
          <span className="text-sm font-medium text-ink/45">
            list price ${premium.priceMonthly}/mo
          </span>
        </div>

        <ul className="mt-4 space-y-2 border-t border-ink/[0.07] pt-4">
          {premium.features.map((f) => (
            <li key={f} className="flex gap-2 text-sm text-ink/70">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
              {f}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-baseline justify-between border-t border-ink/[0.07] pt-4">
          <span className="text-sm font-bold text-ink">Charged today</span>
          <span className="text-2xl font-extrabold tracking-tight text-ink">$0.00</span>
        </div>

        <FormError message={error} />

        <Button
          size="lg"
          className="mt-4 w-full"
          disabled={mutation.isPending}
          onClick={() => {
            setError(null);
            mutation.mutate();
          }}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Activating…
            </>
          ) : (
            <>
              <Crown className="h-4 w-4" /> Activate Premium
            </>
          )}
        </Button>

        <p className="mt-3 text-center text-[11px] leading-relaxed text-ink/40">
          You can switch back to Free at any time from the plans page.
        </p>
      </Card>
    </div>
  );
}
