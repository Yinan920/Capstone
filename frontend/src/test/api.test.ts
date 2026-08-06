/**
 * Real-mode API contract tests: with VITE_USE_MOCKS=false the api layer must
 * hit the FastAPI endpoints, attach the JWT, and surface backend errors as
 * ApiError. fetch is stubbed — no server needed.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function loadRealApi() {
  vi.resetModules();
  vi.stubEnv('VITE_USE_MOCKS', 'false');
  const api = await import('@/lib/api');
  const auth = await import('@/store/authStore');
  auth.useAuthStore.getState().logout();
  return { api, auth };
}

describe('api layer (real mode)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('login POSTs credentials to /auth/login', async () => {
    const { api } = await loadRealApi();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ token: 't0k3n', user: { id: '1', email: 'a@b.co', name: 'A', tier: 'free', createdAt: '' } }),
    );

    const res = await api.login('a@b.co', 'secret123');

    expect(res.token).toBe('t0k3n');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8000/api/auth/login');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.co', password: 'secret123' });
  });

  it('attaches Authorization: Bearer after setAuth', async () => {
    const { api, auth } = await loadRealApi();
    auth.useAuthStore
      .getState()
      .setAuth('jwt-abc', { id: '1', email: 'a@b.co', name: 'A', tier: 'premium', createdAt: '' });
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    await api.getDatasets();

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer jwt-abc');
  });

  it('surfaces the backend detail message as ApiError with status', async () => {
    const { api } = await loadRealApi();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ detail: 'Competitor benchmarking is a Premium feature. Upgrade to unlock.' }, 402),
    );

    await expect(api.getCompetitorComparisons()).rejects.toMatchObject({
      name: 'ApiError',
      status: 402,
      message: 'Competitor benchmarking is a Premium feature. Upgrade to unlock.',
    });
  });

  it('uploadDataset sends multipart form data without a JSON content type', async () => {
    const { api } = await loadRealApi();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        dataset: { id: 'd1', name: 'n', source: 'amazon', productName: 'p', reviewCount: 5, createdAt: '' },
        job: { id: 'j1', datasetId: 'd1', status: 'queued', progress: 0, createdAt: '' },
      }),
    );
    const file = new File(['author,rating,text,created_at\n'], 'reviews.csv', { type: 'text/csv' });

    await api.uploadDataset({ file, name: 'n', productName: 'p', source: 'amazon' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8000/api/datasets/upload');
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.headers['Content-Type']).toBeUndefined();
    expect(init.body.get('productName')).toBe('p');
    expect(init.body.get('file')).toBe(file);
  });
});
