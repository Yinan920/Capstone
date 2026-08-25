/** Verifies the dashboard delete button on the deployed service, using a
    throwaway account so the demo datasets are never touched. */
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.env.BASE ?? 'https://sellersense-ai.web.app';
const OUT = 'e2e/shots-delete';
fs.mkdirSync(OUT, { recursive: true });
const ok = (m) => console.log('✅ ' + m);

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
p.setDefaultTimeout(30000);
try {
  const email = `del-${Date.now()}@test.co`;
  await p.goto(`${BASE}/register`, { timeout: 45000 });
  await p.getByLabel(/your name/i).fill('Delete Tester');
  await p.getByLabel(/email/i).fill(email);
  await p.getByLabel(/password/i).fill('S3cure!pass');
  await p.getByRole('button', { name: /create free account/i }).click();
  await p.waitForURL('**/app');
  ok('throwaway account created (demo data untouched)');

  await p.getByRole('navigation').getByRole('link', { name: /upload reviews/i }).click();
  await p.getByLabel(/dataset name/i).fill('Delete me');
  await p.getByLabel(/product name/i).fill('NovaBrew Go Portable Espresso Maker');
  await p.setInputFiles('#csv-file', '../backend/data/sample_reviews_shopify.csv');
  await p.getByRole('button', { name: /upload & analyze/i }).click();
  await p.getByText(/analysis complete/i).waitFor({ timeout: 90000 });
  await p.getByRole('link', { name: /view insights dashboard/i }).click();
  await p.getByText(/AI analysis of 30 customer reviews/i).waitFor();
  ok('dataset uploaded and analysed (30 reviews)');

  // First click must only arm, not delete
  await p.getByRole('button', { name: /delete dataset/i }).click();
  await p.getByText(/delete this dataset and its analysis\?/i).waitFor();
  await p.screenshot({ path: `${OUT}/01-confirm.png` });
  if (!(await p.getByText(/AI analysis of 30 customer reviews/i).isVisible()))
    throw new Error('first click deleted without confirming');
  ok('first click only asks for confirmation — nothing deleted yet');

  // Cancel keeps the data
  await p.getByRole('button', { name: /^cancel$/i }).click();
  await p.getByRole('button', { name: /delete dataset/i }).waitFor();
  ok('cancel backs out safely');

  // Confirm actually deletes → empty state
  await p.getByRole('button', { name: /delete dataset/i }).click();
  await p.getByRole('button', { name: /yes, delete/i }).click();
  await p.getByText(/no reviews yet/i).waitFor({ timeout: 30000 });
  await p.screenshot({ path: `${OUT}/02-after-delete.png` });
  ok('confirmed delete → dashboard back to the empty state');

  console.log('\n🎉 DELETE FLOW PASSED');
} catch (e) {
  await p.screenshot({ path: `${OUT}/FAILURE.png` });
  console.error('\n❌ FAILED:', e.message);
  process.exitCode = 1;
} finally { await b.close(); }
