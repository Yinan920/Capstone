import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/lib/types';
import { useAppStore } from './appStore';

/**
 * Real authentication state (JWT + current user), persisted to localStorage so
 * a refresh keeps you signed in. In mock mode the app never requires it — the
 * route guard passes straight through — but the same store still backs the
 * user chip in the shell if a mock "login" happens.
 *
 * Setting auth also syncs the plan tier into the app store, which is what all
 * premium gating reads. That keeps one source of truth for the UI while the
 * backend stays authoritative (free users still get a real 402 server-side).
 */
interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        set({ token, user });
        useAppStore.getState().setTier(user.tier);
      },
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'sellersense-auth',
      onRehydrateStorage: () => (state) => {
        if (state?.user) useAppStore.getState().setTier(state.user.tier);
      },
    },
  ),
);

/** Read the token outside React (used by the api layer). */
export function getAuthToken(): string | null {
  return useAuthStore.getState().token;
}
