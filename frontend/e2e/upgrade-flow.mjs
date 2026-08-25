/** Verifies the free → premium conversion loop on the deployed service. */
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.env.BASE ?? 'https://sellersense-ai.web.app';
const OUT = 'e2e/shots-upgrade';
fs.mkdirSync(OUT, { recursive: true });
const ok = (m) => console.log('✅ ' + m);

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
p.setDefaultTimeout(30000);
try {
  const email = `upgrade-${Date.now()}@test.co`;
  await p.goto(`${BASE}/register`, { timeout: 45000 });
  await p.getByLabel(/your name/i).fill('Upgrade Tester');
  await p.getByLabel(/email/i).fill(email);
  await p.getByLabel(/password/i).fill('S3cure!pass');
  await p.getByRole('button', { name: /create free account/i }).click();
  await p.waitForURL('**/app');
  ok('registered a free account');

  // Free plan chip in the top bar must offer an upgrade path
  await p.getByRole('link', { name: /free plan/i }).click();
  await p.getByText(/unlock the full picture/i).waitFor();
  await p.screenshot({ path: `${OUT}/01-upgrade-page.png` });
  ok('Free-plan chip leads to the upgrade page');

  // Both plans + the PCI note
  await p.getByText('$29').waitFor();
  await p.getByText(/stripe checkout/i).waitFor();
  ok('plans and the hosted-checkout note render');

  // Plans → checkout
  await p.getByRole('button', { name: /activate premium/i }).click();
  await p.waitForURL('**/checkout', { timeout: 30000 });
  await p.getByText(/order summary/i).waitFor();
  await p.getByText(/total due today/i).waitFor();
  await p.screenshot({ path: `${OUT}/02-checkout.png` });
  ok('checkout shows the order summary and total');

  // Payment methods are selectable, and no card fields exist anywhere
  await p.getByRole('radio', { name: /paypal/i }).click();
  const inputs = await p.locator('input, textarea, select').count();
  if (inputs !== 0) throw new Error(`checkout must collect no payment data, found ${inputs} fields`);
  ok('payment methods selectable; zero data-collecting fields on the page');

  await p.getByRole('button', { name: /complete purchase/i }).click();
  await p.waitForURL('**/upgrade**', { timeout: 30000 });
  await p.getByText(/you’re on premium|you're on premium/i).first().waitFor();
  await p.screenshot({ path: `${OUT}/03-upgraded.png` });
  ok('purchase completed → account is on Premium');

  await p.getByRole('navigation').getByRole('link', { name: /competitors/i }).click();
  ok('premium navigation reachable (gate removed)');

  // Tier badge flipped and the gate is gone
  await p.getByText('Premium', { exact: true }).first().waitFor();
  ok('top bar now shows the Premium badge');

  // A freshly upgraded account has no data yet — must show guidance, not a crash
  await p.getByText(/upload your reviews to compare/i).waitFor();
  await p.screenshot({ path: `${OUT}/04-premium-empty-state.png` });
  ok('empty benchmarking state renders instead of breaking');

  // Give it data, then the real comparison should appear
  await p.getByRole('navigation').getByRole('link', { name: /upload reviews/i }).click();
  await p.getByLabel(/dataset name/i).fill('Upgrade flow dataset');
  await p.getByLabel(/product name/i).fill('NovaBrew Go Portable Espresso Maker');
  await p.setInputFiles('#csv-file', '../backend/data/sample_reviews.csv');
  await p.getByRole('button', { name: /upload & analyze/i }).click();
  await p.getByText(/analysis complete/i).waitFor({ timeout: 60000 });
  ok('premium upload + analysis completed');

  await p.getByRole('navigation').getByRole('link', { name: /competitors/i }).click();
  await p.getByText(/wanderbean mini|pocketpress pro/i).first().waitFor({ timeout: 30000 });
  await p.screenshot({ path: `${OUT}/05-premium-competitors.png` });
  ok('real competitor comparison renders for the upgraded account');

  console.log('\n🎉 UPGRADE FLOW PASSED');
} catch (e) {
  await p.screenshot({ path: `${OUT}/FAILURE.png` });
  console.error('\n❌ FAILED:', e.message);
  process.exitCode = 1;
} finally { await b.close(); }
