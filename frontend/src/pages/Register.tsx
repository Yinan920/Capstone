import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import AuthLayout, { Field, FormError } from '@/components/auth/AuthLayout';
import Button from '@/components/ui/Button';
import { ApiError, register } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function Register() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const { token, user } = await register(email, name, password);
      setAuth(token, user);
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server. Is the backend running?');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Free to start"
      title="Create your account"
      subtitle="Analyze up to 50 reviews per upload on the free plan — no credit card."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-500 hover:text-brand-600">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field
          id="name"
          label="Your name"
          autoComplete="name"
          placeholder="Ava Chen"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <FormError message={error} />
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          <Sparkles className="h-4 w-4" /> {submitting ? 'Creating account…' : 'Create free account'}
        </Button>
      </form>
    </AuthLayout>
  );
}
