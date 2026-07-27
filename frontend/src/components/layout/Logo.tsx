import { cn } from '@/lib/utils';

export default function Logo({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-grad text-sm font-black text-white shadow-[0_6px_16px_-6px_rgba(79,50,231,0.7)]">
        S
      </span>
      {!compact && (
        <span className={cn('text-lg font-extrabold tracking-tight', light ? 'text-white' : 'text-ink')}>
          Seller<span className="text-brand-500">Sense</span>
        </span>
      )}
    </span>
  );
}
