/**
 * Runtime configuration.
 *
 * `USE_MOCKS` is the switch that keeps this frontend backend-compatible:
 * while it is true every api/* function resolves from local fixtures; once the
 * FastAPI backend exists, set VITE_USE_MOCKS=false and the same functions hit
 * `API_BASE_URL` instead — no component changes required.
 */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';

/** Simulated network latency (ms) so the mock UI shows realistic loading states. */
export const MOCK_LATENCY = 450;

export const TIER_LIMITS = {
  free: { reviewCap: 50, csvOnly: true },
  premium: { reviewCap: 200, csvOnly: false },
} as const;
