const { chromium } = require('playwright');
const path = require('path');

const SCREENS = ['beranda', 'jadwal', 'izin', 'laporan', 'profil'];
const base = 'file://' + path.resolve(__dirname, 'screen.html');

(async () => {
  const browser = await chromium.launch();
  for (const [tag, w, h, dsf, extra] of [
    ['phone', 390, 844, 4, ''],
    ['tablet', 1024, 1366, 2, '&d=tablet&inset=32'],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf });
    const page = await ctx.newPage();
    for (const s of SCREENS) {
      await page.goto(`${base}?s=${s}&w=${w}&h=${h}${extra}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(250);
      await page.screenshot({ path: `build/screen-${tag}-${s}.png` });
    }
    await ctx.close();
  }
  await browser.close();
  console.log('screens rendered');
})();
