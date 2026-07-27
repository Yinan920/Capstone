/**
 * Typed API layer — the single seam between the frontend and its data source.
 *
 * Every function returns a domain type from `types.ts`. Today they resolve from
 * local mocks; when the backend exists, flip VITE_USE_MOCKS=false and each branch
 * calls the real FastAPI endpoint instead. Components never import mocks directly,
 * so nothing above this file changes when the backend lands.
 */
import { API_BASE_URL, MOCK_LATENCY, USE_MOCKS } from './config';
import { delay } from './utils';
import type {
  CompetitorComparison,
  DashboardData,
  Dataset,
  FeedbackAlert,
  ReplyDraft,
  Review,
  User,
} from './types';
import {
  MOCK_ALERTS,
  MOCK_COMPETITORS,
  MOCK_DATASETS,
  MOCK_USER,
  getMockDashboard,
  getMockReplyDraft,
} from '@/mocks/data';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return (await res.json()) as T;
}

/** GET /auth/me */
export async function getCurrentUser(): Promise<User> {
  if (USE_MOCKS) return delay(MOCK_USER, MOCK_LATENCY);
  return http<User>('/auth/me');
}

/** GET /datasets */
export async function getDatasets(): Promise<Dataset[]> {
  if (USE_MOCKS) return delay(MOCK_DATASETS, MOCK_LATENCY);
  return http<Dataset[]>('/datasets');
}

/** GET /datasets/:id/dashboard */
export async function getDashboard(datasetId: string): Promise<DashboardData> {
  if (USE_MOCKS) return delay(getMockDashboard(datasetId), MOCK_LATENCY);
  return http<DashboardData>(`/datasets/${datasetId}/dashboard`);
}

/** GET /competitors — premium only */
export async function getCompetitorComparisons(): Promise<CompetitorComparison[]> {
  if (USE_MOCKS) return delay(MOCK_COMPETITORS, MOCK_LATENCY);
  return http<CompetitorComparison[]>('/competitors');
}

/** GET /alerts — premium only */
export async function getAlerts(): Promise<FeedbackAlert[]> {
  if (USE_MOCKS) return delay(MOCK_ALERTS, MOCK_LATENCY);
  return http<FeedbackAlert[]>('/alerts');
}

/** POST /reviews/:id/reply-draft — premium only */
export async function getReplyDraft(review: Review): Promise<ReplyDraft> {
  if (USE_MOCKS) return delay(getMockReplyDraft(review), MOCK_LATENCY + 300);
  return http<ReplyDraft>(`/reviews/${review.id}/reply-draft`, { method: 'POST' });
}
