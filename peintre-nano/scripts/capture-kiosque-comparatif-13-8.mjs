/**
 * Headless comparatif kiosque vente : Peintre (4444) vs legacy (4445), apres login.
 * Identifiants uniquement via variables d'environnement : PROOF_USER, PROOF_PASS
 * Sortie : ../../references/artefacts/2026-04-12_08_preuves-kiosque-13-8-headless/
 *
 *   cd peintre-nano
 *   $env:PROOF_USER='...'; $env:PROOF_PASS='...'; node .\scripts\capture-kiosque-comparatif-13-8.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../../references/artefacts/2026-04-12_08_preuves-kiosque-13-8-headless');
const CHROME =
  process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PEINTRE_PORT = process.env.PEINTRE_PORT ?? '4444';
const LEGACY_PORT = process.env.LEGACY_PORT ?? '4445';
const user = process.env.PROOF_USER;
const pass = process.env.PROOF_PASS;

if (!user || !pass) {
  console.error('Missing PROOF_USER or PROOF_PASS');
  process.exit(2);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

async function launch() {
  return puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900'],
  });
}

/** @param {import('puppeteer-core').Page} page */
async function loginLegacy(page) {
  await page.waitForSelector('#username', { timeout: 25000 });
  await page.click('#username', { clickCount: 3 });
  await page.type('#username', user, { delay: 15 });
  await page.click('#password', { clickCount: 3 });
  await page.type('#password', pass, { delay: 15 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 120000 }).catch(() => {}),
    page.click('form button[type="submit"]'),
  ]);
  await new Promise((r) => setTimeout(r, 3000));
}

/**
 * Legacy : `Sale` exige une session ouverte. Le parcours nominal `/cash-register/session/open`
 * attend souvent un `register_id` (hub). On utilise la **branche virtuelle** (auto-sélection caisse).
 */
/** @param {import('puppeteer-core').Page} page */
async function ensureLegacyVirtualSessionAndSalePath(page, base) {
  const registerId =
    process.env.LEGACY_VIRTUAL_REGISTER_ID ?? '31d56e8f-08ec-4907-9163-2a5c49c5f2fe';
  const openPath = `${base}/cash-register/virtual/session/open?register_id=${encodeURIComponent(registerId)}`;
  const salePath = `${base}/cash-register/virtual/sale?register_id=${encodeURIComponent(registerId)}`;
  await page.goto(openPath, { waitUntil: 'networkidle2', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 2500));
  const input =
    (await page.$('input[data-testid="initial-amount-input"]')) ??
    (await page.$('[data-testid="initial-amount-input"] input')) ??
    (await page.$('input[placeholder="0.00"]'));
  if (input) {
    await input.click({ clickCount: 3 });
    await input.type('100', { delay: 25 });
  }
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 120000 }).catch(() => {}),
    page.evaluate(() => {
      const btn = [...document.querySelectorAll('button[type="submit"]')].find((b) => {
        const t = b.textContent ?? '';
        return t.includes('Ouvrir la Session') || t.includes('Reprendre la Session');
      });
      btn?.click();
    }),
  ]);
  await new Promise((r) => setTimeout(r, 4000));
  return salePath;
}

/** @param {import('puppeteer-core').Page} page */
async function loginPeintre(page) {
  const sel = '[data-testid="public-login-widget"]';
  await page.waitForSelector(sel, { timeout: 25000 });
  const u = await page.$('input[name="username"]');
  const p = await page.$('input[name="password"]');
  if (!u || !p) throw new Error('Peintre login inputs not found');
  await u.click({ clickCount: 3 });
  await u.type(user, { delay: 15 });
  await p.click({ clickCount: 3 });
  await p.type(pass, { delay: 15 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 120000 }).catch(() => {}),
    page.click(`${sel} button[type="submit"]`),
  ]);
  await new Promise((r) => setTimeout(r, 4000));
}

/** @param {import('puppeteer-core').Page} page */
async function collectSignals(page) {
  return page.evaluate(() => {
    const t = (s) => s?.trim() || '';
    const body = document.body?.innerText?.slice(0, 12000) ?? '';
    return {
      url: location.href,
      hasKioskTestId: !!document.querySelector('[data-testid="cash-register-sale-kiosk"]'),
      hasCategoryGrid: !!document.querySelector('[data-testid="cashflow-kiosk-category-grid"]'),
      hasWizardStep: !!document.querySelector('[data-wizard-step]'),
      title: t(document.title),
      textSample: body.slice(0, 2500),
    };
  });
}

async function runPeintre(label, port, loginFn) {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    const base = `http://localhost:${port}`;
    await page.goto(`${base}/cash-register/sale`, { waitUntil: 'networkidle2', timeout: 120000 });
    await loginFn(page);
    await page.goto(`${base}/cash-register/sale`, { waitUntil: 'networkidle2', timeout: 120000 });
    await new Promise((r) => setTimeout(r, 5000));
    const signals = await collectSignals(page);
    const png = path.join(OUT_DIR, `kiosque-${label}-sale.png`);
    await page.screenshot({ path: png, fullPage: true });
    await fs.promises.writeFile(
      path.join(OUT_DIR, `signals-${label}.json`),
      JSON.stringify(signals, null, 2),
      'utf8',
    );
    return { png, signals };
  } finally {
    await browser.close();
  }
}

async function runLegacy(label, port, loginFn) {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    const base = `http://localhost:${port}`;
    await page.goto(`${base}/cash-register/sale`, { waitUntil: 'networkidle2', timeout: 120000 });
    await loginFn(page);
    const salePath = await ensureLegacyVirtualSessionAndSalePath(page, base);
    await page.goto(salePath, { waitUntil: 'networkidle2', timeout: 120000 });
    await new Promise((r) => setTimeout(r, 5000));
    const signals = await collectSignals(page);
    const png = path.join(OUT_DIR, `kiosque-${label}-sale.png`);
    await page.screenshot({ path: png, fullPage: true });
    await fs.promises.writeFile(
      path.join(OUT_DIR, `signals-${label}.json`),
      JSON.stringify(signals, null, 2),
      'utf8',
    );
    return { png, signals };
  } finally {
    await browser.close();
  }
}

const peintre = await runPeintre('peintre-4444', PEINTRE_PORT, loginPeintre);
const legacy = await runLegacy('legacy-4445', LEGACY_PORT, loginLegacy);

const summary = {
  date: new Date().toISOString(),
  peintre: peintre.signals,
  legacy: legacy.signals,
};
await fs.promises.writeFile(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
console.log(JSON.stringify(summary, null, 2));
