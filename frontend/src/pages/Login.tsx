import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import AuthLayout, { Field, FormError } from '@/components/auth/AuthLayout';
import Button from '@/components/ui/Button';
import { ApiError, login } from '@/lib/api';
import { USE_MOCKS } from '@/lib/config';
import { useAuthStore } from '@/store/authStore';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { token, user } = await login(email, password);
      setAuth(token, user);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? '/app', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server. Is the backend running?');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in to SellerSense"
      subtitle="Your reviews, themes, and alerts are where you left them."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-semibold text-brand-500 hover:text-brand-600">
            Create a free account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@store.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <FormError message={error} />
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          <LogIn className="h-4 w-4" /> {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
        {USE_MOCKS && (
          <p className="text-center text-xs text-ink/40">
            Demo mode — any email and password will sign you in.
          </p>
        )}
      </form>
    </AuthLayout>
  );
}
