import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '@/lib/api';
import { USE_MOCKS } from '@/lib/config';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';

/**
 * Guards /app routes. Mock mode passes straight through (the demo needs no
 * login). Real mode requires a token; it also re-validates it against
 * GET /auth/me on load so a stale/revoked token drops you back to /login and
 * the plan tier always reflects the server.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const setTier = useAppStore((s) => s.setTier);

  const { isError } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const user = await getCurrentUser();
      useAuthStore.setState({ user });
      setTier(user.tier);
      return user;
    },
    enabled: !USE_MOCKS && !!token,
    retry: false,
    staleTime: 5 * 60_000,
  });

  if (USE_MOCKS) return <>{children}</>;
  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (isError) {
    logout();
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
