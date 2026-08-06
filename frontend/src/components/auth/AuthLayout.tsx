import type { InputHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import Logo from '@/components/layout/Logo';
import { cn } from '@/lib/utils';

/** Split-screen frame shared by Login and Register. */
export default function AuthLayout({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link to="/" className="w-fit">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <p className="eyebrow mb-2 text-brand-500">{eyebrow}</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">{title}</h1>
          <p className="mt-2 text-sm text-ink/55">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 text-sm text-ink/55">{footer}</div>
        </div>
      </div>

      {/* Brand side */}
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-brand-500/40 blur-[120px]" />
        <div className="absolute -right-24 bottom-1/4 h-80 w-80 rounded-full bg-violet-500/30 blur-[100px]" />
        <div className="relative flex h-full flex-col justify-center px-14">
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80">
            <Sparkles className="h-3.5 w-3.5 text-signal" /> AI feedback intelligence
          </div>
          <p className="max-w-md text-3xl font-extrabold leading-tight tracking-tight text-white">
            Every review your store gets, turned into a
            <span className="bg-brand-grad bg-clip-text text-transparent"> prioritized action plan</span>.
          </p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/50">
            Upload a CSV of reviews and let the AI pipeline score sentiment, surface complaint
            themes, and alert you before a packaging issue becomes a rating drop.
          </p>
        </div>
      </div>
    </div>
  );
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, id, className, ...props }, ref) => (
    <label className="block" htmlFor={id}>
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      <input
        ref={ref}
        id={id}
        className={cn(
          'h-11 w-full rounded-xl border border-ink/15 bg-white px-3.5 text-sm text-ink',
          'placeholder:text-ink/30 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25',
          className,
        )}
        {...props}
      />
    </label>
  ),
);
Field.displayName = 'Field';

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl border border-negative/25 bg-negative/[0.06] px-3.5 py-2.5 text-sm font-medium text-negative">
      {message}
    </p>
  );
}
