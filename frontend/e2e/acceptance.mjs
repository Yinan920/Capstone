/**
 * End-to-end acceptance: real browser → real frontend (VITE_USE_MOCKS=false)
 * → real FastAPI backend → real PostgreSQL.
 *
 * Prereqs: backend on :8000 (fresh DB, seeded), frontend dev server on :5173
 * started with VITE_USE_MOCKS=false.
 *
 * Run:  node e2e/acceptance.mjs
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

// Point BASE at any deployment (local dev or the Cloud Run URL):
//   BASE=https://sellersense-xxxx.run.app node e2e/acceptance.mjs
const BASE = process.env.BASE ?? 'http://localhost:5173';
const SHOTS = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  process.env.BASE ? 'shots-cloud' : 'shots',
);
fs.mkdirSync(SHOTS, { recursive: true });

const CSV = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../backend/data/sample_reviews.csv',
);

let step = 0;
async function shot(page, name) {
  step += 1;
  const file = path.join(SHOTS, `${String(step).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  📸 ${path.basename(file)}`);
}

function ok(label) {
  console.log(`✅ ${label}`);
}

async function uploadFlow(page, datasetName) {
  await page.getByRole('navigation').getByRole('link', { name: /upload reviews/i }).click();
  await page.getByLabel(/dataset name/i).fill(datasetName);
  await page.getByLabel(/product name/i).fill('NovaBrew Go Portable Espresso Maker');
  await page.getByLabel(/sales channel/i).selectOption('amazon');
  await page.setInputFiles('#csv-file', CSV);
  await page.getByRole('button', { name: /upload & analyze/i }).click();
  await page.getByText(/analysis complete/i).waitFor({ timeout: 30_000 });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(15_000);

try {
  // 1. Unauthenticated /app redirects to /login
  // (first navigation gets a generous timeout — a scale-to-zero Cloud Run
  // service cold-starts on the first request)
  await page.goto(`${BASE}/app`, { timeout: 45_000 });
  await page.waitForURL('**/login');
  // Deep-link refresh must survive the SPA fallback (server returns index.html)
  await page.reload();
  await page.getByLabel(/email/i).waitFor();
  ok('unauthenticated /app redirects to /login');
  await shot(page, 'login-redirect');

  // 2. Register a fresh free-tier account through the UI
  const email = `e2e-${Date.now()}@test.co`;
  await page.getByRole('link', { name: /create a free account/i }).click();
  await page.getByLabel(/your name/i).fill('E2E Tester');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill('S3cure!pass');
  await page.getByRole('button', { name: /create free account/i }).click();
  await page.waitForURL('**/app');
  await page.getByText(/no reviews yet/i).waitFor();
  ok(`registered ${email} → empty dashboard state`);
  await shot(page, 'register-empty-dashboard');

  // 3. Upload the 50-row sample CSV and watch the pipeline finish
  await uploadFlow(page, 'Amazon — NovaBrew Go Espresso');
  ok('upload → analysis job reached done');
  await shot(page, 'upload-complete');

  // 4. Dashboard renders real data
  await page.getByRole('link', { name: /view insights dashboard/i }).click();
  await page.getByText(/AI analysis of 50 customer reviews/i).waitFor();
  await page.getByText(/packaging damage/i).first().waitFor();
  ok('dashboard shows 50 analyzed reviews + Packaging damage theme');
  await shot(page, 'dashboard-real-data');

  // 5. Free tier: competitors page is gated (real 402 behind the blur)
  await page.getByRole('navigation').getByRole('link', { name: /competitors/i }).click();
  await page.getByText(/your account is on the free plan/i).waitFor();
  ok('free tier sees the premium gate on Competitors');
  await shot(page, 'free-premium-gate');

  // 6. Sign out → sign in as the seeded premium account
  await page.getByRole('button', { name: /sign out/i }).click();
  await page.waitForURL('**/login');
  await page.getByLabel(/email/i).fill('demo@novabrew.co');
  await page.getByLabel(/password/i).fill('demo1234!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/app');
  ok('premium demo account signed in');

  // 7. Premium upload + competitor board renders real comparison
  await uploadFlow(page, 'Amazon — NovaBrew Go (premium)');
  await page.getByRole('navigation').getByRole('link', { name: /competitors/i }).click();
  await page.getByText(/wanderbean mini/i).first().waitFor({ timeout: 20_000 });
  ok('premium account sees the real competitor comparison');
  await shot(page, 'premium-competitors');

  // 8. Alerts page shows pipeline-generated alerts
  await page.getByRole('navigation').getByRole('link', { name: /alerts/i }).click();
  await page.getByText(/packaging damage/i).first().waitFor({ timeout: 20_000 });
  ok('premium account sees pipeline-generated alerts');
  await shot(page, 'premium-alerts');

  console.log('\n🎉 E2E ACCEPTANCE PASSED');
} catch (err) {
  await shot(page, 'FAILURE');
  console.error('\n❌ E2E FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
