const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Tangkap layar aplikasi ASLI (bundel Expo web) dari server sandbox lokal.
// Hasil: header-search/layar/<prefix><rute>.png pada 430 × 932 pt, skala 3.
//
//   node capture-header-search.js <akun> "<rute>,<rute>,klik:<teks>" [prefix]
//
// Langkah `klik:<teks>` mengetuk elemen pertama bertuliskan <teks>.
// Hanya 127.0.0.1 yang dilayani; permintaan ke host lain diblokir dan dicetak.
const BASE = process.env.APP_URL || 'http://127.0.0.1:8957';
const SANDI = process.env.SANDBOX_PASSWORD;
const OUT = path.resolve(__dirname, 'header-search/layar');
const [akun, rute = '/', prefix = akun] = process.argv.slice(2);

if (!akun || !SANDI) {
  console.error('Pakai: SANDBOX_PASSWORD=... node capture-header-search.js <akun> "<rute,...>" [prefix]');
  process.exit(2);
}
if (new URL(BASE).hostname !== '127.0.0.1') {
  console.error('APP_URL harus 127.0.0.1 (server sandbox lokal), bukan produksi.');
  process.exit(2);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    locale: 'id-ID', timezoneId: 'Asia/Jakarta',
  });
  const keluar = [];
  await ctx.route('**/*', (r) => {
    const u = new URL(r.request().url());
    if (u.hostname === '127.0.0.1' || u.protocol === 'data:' || u.protocol === 'blob:') return r.continue();
    keluar.push(u.href);
    return r.abort();
  });
  const page = await ctx.newPage();
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.getByPlaceholder('Masukkan username').fill(akun);
  await page.getByPlaceholder('Masukkan password').fill(SANDI);
  await page.getByPlaceholder('Masukkan password').press('Enter');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 });
  await page.waitForTimeout(2500);
  for (const r of rute.split(',')) {
    if (r.startsWith('klik:')) {
      await page.getByText(r.slice(5)).first().click();
      await page.waitForLoadState('networkidle');
    } else if (r !== '/') {
      await page.goto(BASE + r, { waitUntil: 'networkidle' });
    }
    await page.waitForTimeout(2500);
    const nama = `${prefix}${r.replace(/[^a-z0-9]+/gi, '-')}`.replace(/-$/, '');
    await page.screenshot({ path: `${OUT}/${nama}.png` });
    console.log('ok', nama, page.url());
  }
  if (keluar.length) console.log('DIBLOKIR', keluar);
  await browser.close();
})();
