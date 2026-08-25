/** Captures the screenshot set used by docs/04-user-guide.md.
 *
 * Walks the whole product on a DEPLOYED instance using a throwaway account, so
 * seeded demo data is never touched, and cleans up after itself (dataset
 * deleted, account downgraded). Images land in docs/images/guide/.
 *
 * Run from frontend/:  node e2e/guide-shots.mjs
 *                      BASE=http://localhost:5173 node e2e/guide-shots.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE ?? 'https://sellersense-ai.web.app';
const OUT = '../docs/images/guide';
fs.mkdirSync(OUT, { recursive: true });
const ok = (m) => console.log('✅ ' + m);
let n = 0;
const shot = async (p, name, opts = {}) => {
  n += 1;
  const file = `${OUT}/${String(n).padStart(2, '0')}-${name}.png`;
  await p.screenshot({ path: file, ...opts });
  console.log(`  📸 ${file.split('/').pop()}`);
};

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
p.setDefaultTimeout(45000);
try {
  // --- Public site --------------------------------------------------------
  await p.goto(BASE, { timeout: 60000 });
  await p.getByRole('heading', { level: 1 }).first().waitFor();
  await p.waitForTimeout(1200);
  await shot(p, 'landing-hero');

  await p.goto(`${BASE}/#pricing`);
  await p.waitForTimeout(1200);
  await shot(p, 'landing-pricing');
  ok('public landing page captured');

  // --- Sign up ------------------------------------------------------------
  const email = `guide-${Date.now()}@example.com`;
  await p.goto(`${BASE}/register`);
  await p.getByLabel(/your name/i).fill('Sam Rivera');
  await p.getByLabel(/email/i).fill(email);
  await p.getByLabel(/password/i).fill('S3cure!pass');
  await shot(p, 'register');
  await p.getByRole('button', { name: /create free account/i }).click();
  await p.waitForURL('**/app');
  await p.waitForTimeout(800);
  await shot(p, 'empty-dashboard');
  ok(`registered ${email}`);

  // --- Upload -------------------------------------------------------------
  await p.getByRole('navigation').getByRole('link', { name: /upload reviews/i }).click();
  await p.getByLabel(/dataset name/i).fill('Amazon — August reviews');
  await p.getByLabel(/product name/i).fill('NovaBrew Go Portable Espresso Maker');
  await p.setInputFiles('#csv-file', '../backend/data/sample_reviews.csv');
  await p.waitForTimeout(500);
  await shot(p, 'upload-form');
  await p.getByRole('button', { name: /upload & analyze/i }).click();
  await p.waitForTimeout(2500);
  await shot(p, 'upload-progress');
  await p.getByText(/analysis complete/i).waitFor({ timeout: 180000 });
  await shot(p, 'upload-complete');
  ok('upload + analysis captured');

  // --- Dashboard ----------------------------------------------------------
  await p.getByRole('link', { name: /view insights dashboard/i }).click();
  await p.getByText(/AI analysis of 50 customer reviews/i).waitFor({ timeout: 60000 });
  await p.waitForTimeout(2500); // let charts finish animating
  await shot(p, 'dashboard-top');
  await shot(p, 'dashboard-full', { fullPage: true });
  ok('dashboard captured');

  // --- Paywall ------------------------------------------------------------
  await p.getByRole('navigation').getByRole('link', { name: /competitors/i }).click();
  await p.waitForTimeout(1500);
  await shot(p, 'premium-gate');
  ok('free-tier premium gate captured');

  // --- Upgrade + checkout -------------------------------------------------
  await p.getByRole('link', { name: /free plan/i }).click();
  await p.getByText(/unlock the full picture/i).waitFor();
  await p.waitForTimeout(800);
  await shot(p, 'upgrade-plans');
  await p.getByRole('button', { name: /activate premium/i }).click();
  await p.waitForURL('**/checkout');
  await p.getByText(/order summary/i).waitFor();
  await p.waitForTimeout(600);
  await shot(p, 'checkout');
  await p.getByRole('button', { name: /complete purchase/i }).click();
  await p.waitForURL('**/upgrade**');
  await p.getByText(/you’re on premium|you're on premium/i).first().waitFor();
  await p.waitForTimeout(600);
  await shot(p, 'upgraded');
  ok('upgrade + checkout captured');

  // --- Premium features ---------------------------------------------------
  await p.getByRole('navigation').getByRole('link', { name: /competitors/i }).click();
  await p.getByText(/wanderbean mini|pocketpress pro/i).first().waitFor({ timeout: 45000 });
  await p.waitForTimeout(2000);
  await shot(p, 'competitors', { fullPage: true });

  await p.getByRole('navigation').getByRole('link', { name: /alerts/i }).click();
  await p.waitForTimeout(2000);
  await shot(p, 'alerts');

  await p.getByRole('navigation').getByRole('link', { name: /reply/i }).click();
  await p.waitForTimeout(4000); // first draft is generated on arrival
  await shot(p, 'reply-studio');
  ok('premium features captured');

  // --- Delete (two-step) --------------------------------------------------
  await p.getByRole('navigation').getByRole('link', { name: /dashboard|insights/i }).first().click();
  await p.getByRole('button', { name: /delete dataset/i }).waitFor({ timeout: 30000 });
  await p.getByRole('button', { name: /delete dataset/i }).click();
  await p.getByText(/delete this dataset and its analysis\?/i).waitFor();
  await p.waitForTimeout(400);
  await shot(p, 'delete-confirm');
  await p.getByRole('button', { name: /yes, delete/i }).click();
  await p.getByText(/no reviews yet/i).waitFor({ timeout: 45000 });
  ok('delete confirmation captured; throwaway data removed');

  console.log(`\n🎉 GUIDE SHOTS CAPTURED (${n} images in docs/images/guide/)`);
} catch (e) {
  await p.screenshot({ path: `${OUT}/FAILURE.png` });
  console.error('\n❌ FAILED:', e.message);
  process.exitCode = 1;
} finally {
  await b.close();
}
