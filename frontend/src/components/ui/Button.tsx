import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'signal' | 'ghost' | 'outline' | 'dark';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-500 text-white hover:bg-brand-600 shadow-[0_10px_30px_-10px_rgba(79,50,231,0.6)]',
  signal:
    'bg-signal text-signal-ink hover:brightness-105 shadow-[0_10px_30px_-12px_rgba(167,243,90,0.7)]',
  dark: 'bg-ink text-white hover:bg-ink-soft',
  outline: 'border border-ink/15 text-ink hover:border-ink/30 hover:bg-ink/[0.03]',
  ghost: 'text-ink/70 hover:text-ink hover:bg-ink/[0.04]',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm rounded-lg',
  md: 'h-11 px-5 text-sm rounded-xl',
  lg: 'h-14 px-7 text-base rounded-2xl',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
export default Button;
