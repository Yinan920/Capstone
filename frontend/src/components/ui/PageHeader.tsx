import type { ReactNode } from 'react';

export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow mb-1 text-brand-500">{eyebrow}</p>}
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-ink/55">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Loading({ label = 'Loading insights…' }: { label?: string }) {
  return (
    <div className="grid place-items-center py-24 text-center">
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-brand-100 border-t-brand-500" />
      <p className="mt-3 text-sm font-medium text-ink/50">{label}</p>
    </div>
  );
}
