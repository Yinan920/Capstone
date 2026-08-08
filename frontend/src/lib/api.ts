/**
 * Typed API layer — the single seam between the frontend and its data source.
 *
 * Every function returns a domain type from `types.ts`. With VITE_USE_MOCKS=true
 * (the default) they resolve from local fixtures; with it set to `false` the same
 * functions hit the real FastAPI backend, attaching the JWT from the auth store.
 * Components never import mocks directly, so nothing above this file changes
 * when switching modes.
 */
import { API_BASE_URL, MOCK_LATENCY, USE_MOCKS } from './config';
import { delay } from './utils';
import { getAuthToken } from '@/store/authStore';
import type {
  AnalysisJob,
  AuthResponse,
  CompetitorComparison,
  DashboardData,
  Dataset,
  FeedbackAlert,
  Plan,
  ReplyDraft,
  Review,
  UploadInput,
  UploadResponse,
  User,
} from './types';
import {
  MOCK_ALERTS,
  MOCK_COMPETITORS,
  MOCK_DATASETS,
  MOCK_PLANS,
  MOCK_USER,
  getMockDashboard,
  getMockReplyDraft,
} from '@/mocks/data';

/** Error carrying the HTTP status + the backend's `detail` message. */
export class ApiError extends Error {
  constructor(
    public status: number,
    detail: string,
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  if (!(init?.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { ...headers, ...init?.headers } });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body.detail === 'string') detail = body.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as T;
}

/* ---- Auth ---- */

/** POST /auth/login */
export async function login(email: string, password: string): Promise<AuthResponse> {
  if (USE_MOCKS) {
    void password;
    return delay({ token: 'mock-token', user: { ...MOCK_USER, email } }, MOCK_LATENCY);
  }
  return http<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

/** POST /auth/register */
export async function register(email: string, name: string, password: string): Promise<AuthResponse> {
  if (USE_MOCKS) {
    void password;
    return delay({ token: 'mock-token', user: { ...MOCK_USER, email, name, tier: 'free' as const } }, MOCK_LATENCY);
  }
  return http<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, name, password }),
  });
}

/** GET /auth/me */
export async function getCurrentUser(): Promise<User> {
  if (USE_MOCKS) return delay(MOCK_USER, MOCK_LATENCY);
  return http<User>('/auth/me');
}

/* ---- Datasets & upload ---- */

/** GET /datasets */
export async function getDatasets(): Promise<Dataset[]> {
  if (USE_MOCKS) return delay([...mockUploadedDatasets, ...MOCK_DATASETS], MOCK_LATENCY);
  return http<Dataset[]>('/datasets');
}

/** POST /datasets/upload (multipart) */
export async function uploadDataset(input: UploadInput): Promise<UploadResponse> {
  if (USE_MOCKS) return mockUpload(input);
  const form = new FormData();
  form.append('file', input.file);
  form.append('name', input.name);
  form.append('productName', input.productName);
  form.append('source', input.source);
  return http<UploadResponse>('/datasets/upload', { method: 'POST', body: form });
}

/** GET /jobs/:id */
export async function getJob(jobId: string): Promise<AnalysisJob> {
  if (USE_MOCKS) return mockJobPoll(jobId);
  return http<AnalysisJob>(`/jobs/${jobId}`);
}

/* ---- Billing ---- */

/** GET /billing/plans */
export async function getPlans(): Promise<{ plans: Plan[] }> {
  if (USE_MOCKS) return delay({ plans: MOCK_PLANS }, MOCK_LATENCY);
  return http<{ plans: Plan[] }>('/billing/plans');
}

/** POST /billing/upgrade — activates Premium (payment stubbed, see backend) */
export async function upgradePlan(): Promise<User> {
  if (USE_MOCKS) return delay({ ...MOCK_USER, tier: 'premium' as const }, MOCK_LATENCY + 400);
  return http<User>('/billing/upgrade', { method: 'POST' });
}

/** POST /billing/downgrade — back to Free */
export async function downgradePlan(): Promise<User> {
  if (USE_MOCKS) return delay({ ...MOCK_USER, tier: 'free' as const }, MOCK_LATENCY);
  return http<User>('/billing/downgrade', { method: 'POST' });
}

/* ---- Insights ---- */

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

/* ---- Mock upload simulation (mock mode only) ----
 * Mirrors the real flow: upload returns a queued job, then polling advances it
 * to done in a few steps, and the new dataset appears in getDatasets().
 */
const mockUploadedDatasets: Dataset[] = [];
const mockJobs = new Map<string, AnalysisJob>();
let mockUploadSeq = 0;

async function mockUpload(input: UploadInput): Promise<UploadResponse> {
  const seq = ++mockUploadSeq;
  const dataset: Dataset = {
    id: `ds_upload_${seq}`,
    name: input.name,
    source: input.source,
    productName: input.productName,
    reviewCount: 50,
    createdAt: new Date().toISOString(),
  };
  const job: AnalysisJob = {
    id: `job_upload_${seq}`,
    datasetId: dataset.id,
    status: 'queued',
    progress: 0,
    createdAt: new Date().toISOString(),
  };
  mockUploadedDatasets.unshift(dataset);
  mockJobs.set(job.id, job);
  return delay({ dataset, job }, MOCK_LATENCY);
}

async function mockJobPoll(jobId: string): Promise<AnalysisJob> {
  const job = mockJobs.get(jobId);
  if (!job) throw new ApiError(404, 'Job not found');
  if (job.status !== 'done') {
    job.status = 'running';
    job.progress = Math.min(100, job.progress + 34);
    if (job.progress >= 100) job.status = 'done';
  }
  return delay({ ...job }, MOCK_LATENCY / 2);
}
