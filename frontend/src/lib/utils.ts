import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind-aware className combiner. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Resolve a mock value after a short simulated network delay. */
export function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export function formatPct(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatSignedPct(value: number, digits = 0): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(digits)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/** Net sentiment (-1..1) → readable label + status color role. */
export function sentimentTone(score: number): {
  label: string;
  role: 'positive' | 'neutral' | 'negative';
} {
  if (score >= 0.2) return { label: 'Positive', role: 'positive' };
  if (score <= -0.2) return { label: 'Negative', role: 'negative' };
  return { label: 'Mixed', role: 'neutral' };
}
