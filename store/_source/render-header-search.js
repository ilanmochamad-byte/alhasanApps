const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Header (21:9) dan Search results (3:2) App Store dari header-search.html.
// Ukuran CSS × deviceScaleFactor 2 = ukuran piksel persis yang diminta Apple.
const base = 'file://' + path.resolve(__dirname, 'header-search.html');

const TARGETS = [
  { id: 'header', css: [1920, 823], out: 'header-3840x1646.png' },
  { id: 'search', css: [1920, 1280], out: 'search-results-3840x2560.png' },
];

(async () => {
  const browser = await chromium.launch();
  fs.mkdirSync('out/appstore-header-search', { recursive: true });
  for (const target of TARGETS) {
    const page = await browser.newPage({
      viewport: { width: target.css[0], height: target.css[1] },
      deviceScaleFactor: 2,
    });
    await page.goto(base);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    await page.locator('#' + target.id).screenshot({ path: `out/appstore-header-search/${target.out}` });
    await page.close();
    console.log('done', target.out);
  }
  await browser.close();
})();
