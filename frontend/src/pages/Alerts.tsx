import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, Settings2, Zap } from 'lucide-react';
import { getAlerts } from '@/lib/api';
import type { FeedbackAlert } from '@/lib/types';
import Button from '@/components/ui/Button';
import PageHeader, { Loading } from '@/components/ui/PageHeader';
import PremiumGate from '@/components/ui/PremiumGate';
import AlertCard from '@/components/alerts/AlertCard';

const SIMULATED: Omit<FeedbackAlert, 'id' | 'triggeredAt' | 'isNew'> = {
  theme: 'Leaking seal',
  severity: 'serious',
  share: 0.13,
  threshold: 0.1,
  previousShare: 0.04,
  windowDays: 14,
  sampleReviews: [
    'Water leaks from the seal after a few uses.',
    'Noticed dripping around the gasket within a week.',
  ],
  emailSentTo: 'demo@novabrew.co',
};

export default function Alerts() {
  const { data, isLoading } = useQuery({ queryKey: ['alerts'], queryFn: getAlerts });
  const [alerts, setAlerts] = useState<FeedbackAlert[]>([]);

  useEffect(() => {
    if (data) setAlerts(data);
  }, [data]);

  function simulate() {
    setAlerts((prev) => [
      { ...SIMULATED, id: `al_${Date.now()}`, triggeredAt: new Date().toISOString(), isNew: true },
      ...prev.map((a) => ({ ...a, isNew: false })),
    ]);
  }

  return (
    <>
      <PageHeader
        eyebrow="Smart feedback alerts"
        title="Catch problems before they spread"
        subtitle="When a negative theme breaks its threshold, SellerSense emails you instantly — no dashboard-watching required."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Settings2 className="h-4 w-4" /> Thresholds
            </Button>
            <Button variant="signal" onClick={simulate}>
              <Zap className="h-4 w-4" /> Simulate a new alert
            </Button>
          </div>
        }
      />
      <PremiumGate
        title="Smart alerts are a Premium feature"
        blurb="Get an email the moment a complaint theme like ‘packaging damaged’ crosses your risk threshold."
      >
        {isLoading ? (
          <Loading label="Checking alert rules…" />
        ) : (
          <>
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-ink/[0.07] bg-white px-4 py-3 text-sm text-ink/60">
              <Bell className="h-4 w-4 text-brand-500" />
              <span>
                <span className="font-semibold text-ink">{alerts.length} active alerts</span> · rule engine
                runs automatically after every analysis · default trigger at{' '}
                <span className="font-semibold text-ink">15% share</span>.
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {alerts.map((a) => (
                <AlertCard key={a.id} alert={a} />
              ))}
            </div>
          </>
        )}
      </PremiumGate>
    </>
  );
}
