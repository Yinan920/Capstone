import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Apple,
  ArrowLeft,
  BadgeCheck,
  Check,
  CreditCard,
  Loader2,
  Lock,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { ApiError, getPlans, upgradePlan } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Loading } from '@/components/ui/PageHeader';
import { FormError } from '@/components/auth/AuthLayout';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

type Method = 'card' | 'paypal' | 'applepay';

const METHODS: { id: Method; label: string; detail: string; icon: typeof CreditCard }[] = [
  {
    id: 'card',
    label: 'Credit or debit card',
    detail: 'Visa, Mastercard, Amex — entered on Stripe’s secure page',
    icon: CreditCard,
  },
  { id: 'paypal', label: 'PayPal', detail: 'You’ll approve the subscription in PayPal', icon: Wallet },
  { id: 'applepay', label: 'Apple Pay', detail: 'Confirm with Touch ID or Face ID', icon: Apple },
];

export default function Checkout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setTier = useAppStore((s) => s.setTier);
  const authUser = useAuthStore((s) => s.user);
  const [method, setMethod] = useState<Method>('card');
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

  if (isLoading || !premium) return <Loading label="Loading checkout…" />;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/app/upgrade"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink/50 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to plans
      </Link>

      <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
        Complete your upgrade
      </h1>
      <p className="mt-1 text-sm text-ink/55">
        You’re subscribing to SellerSense {premium.name}. Cancel any time from this page.
      </p>

      {/* Demo banner — stated up front, not buried in fine print. */}
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/[0.07] p-4">
        <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <p className="text-sm leading-relaxed text-ink/70">
          <strong className="text-ink">Demonstration checkout.</strong> No payment is taken and no
          card details are collected anywhere in this flow. In production this screen hands off to{' '}
          <strong className="text-ink">Stripe Checkout</strong>, a payment page hosted by Stripe —
          card numbers go straight to them and never touch SellerSense servers, which keeps the
          application out of PCI DSS scope.
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-5">
        {/* Payment method */}
        <Card className="lg:col-span-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink/45">Payment method</h2>
          <div className="mt-4 space-y-2.5" role="radiogroup" aria-label="Payment method">
            {METHODS.map(({ id, label, detail, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={method === id}
                onClick={() => setMethod(id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all',
                  method === id
                    ? 'border-brand-400 bg-brand-50/60 ring-1 ring-brand-500/20'
                    : 'border-ink/10 bg-white hover:border-ink/25',
                )}
              >
                <span
                  className={cn(
                    'grid h-10 w-10 shrink-0 place-items-center rounded-xl',
                    method === id ? 'bg-brand-grad text-white' : 'bg-ink/[0.05] text-ink/50',
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{label}</span>
                  <span className="block truncate text-xs text-ink/50">{detail}</span>
                </span>
                <span
                  className={cn(
                    'grid h-5 w-5 shrink-0 place-items-center rounded-full border-2',
                    method === id ? 'border-brand-500 bg-brand-500' : 'border-ink/20',
                  )}
                >
                  {method === id && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                </span>
              </button>
            ))}
          </div>

          <p className="mt-4 flex items-center gap-2 text-xs text-ink/45">
            <Lock className="h-3.5 w-3.5" />
            Card entry happens on the provider’s page — this form collects no payment details.
          </p>
        </Card>

        {/* Order summary */}
        <Card className="lg:col-span-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink/45">Order summary</h2>

          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-sm font-semibold text-ink">SellerSense {premium.name}</span>
            <span className="text-sm font-semibold text-ink">
              ${premium.priceMonthly}.00
            </span>
          </div>
          <p className="mt-0.5 text-xs text-ink/45">Billed monthly · cancel any time</p>

          <ul className="mt-4 space-y-2 border-t border-ink/[0.07] pt-4">
            {premium.features.map((f) => (
              <li key={f} className="flex gap-2 text-xs text-ink/60">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-positive" />
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-baseline justify-between border-t border-ink/[0.07] pt-4">
            <span className="text-sm font-bold text-ink">Total due today</span>
            <span className="text-2xl font-extrabold tracking-tight text-ink">
              ${premium.priceMonthly}.00
            </span>
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
                <ShieldCheck className="h-4 w-4" /> Complete purchase
              </>
            )}
          </Button>

          <p className="mt-3 text-center text-[11px] leading-relaxed text-ink/40">
            Demo mode — clicking activates Premium immediately without a charge.
          </p>
        </Card>
      </div>
    </div>
  );
}
