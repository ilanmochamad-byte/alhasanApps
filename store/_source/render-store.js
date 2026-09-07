const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const base = 'file://' + path.resolve(__dirname, 'frame.html');

const SHOTS = [
  { key: 'beranda', t: 'Sesi hari ini,|langsung terlihat',
    s: 'Kartu sorot menunjuk satu tugas terdekat — absensinya terbuka dalam satu ketukan.' },
  { key: 'jadwal', t: 'Jadwal mengajar|sebulan penuh',
    s: 'Dikelompokkan per tanggal, dengan pilihan rentang 7 hari, 30 hari, atau kustom.' },
  { key: 'izin', t: 'Antrean izin santri|dalam satu layar',
    s: 'Admin, pengurus, murobi, dan orang tua — satu akun, cakupan berpindah tanpa login ulang.' },
  { key: 'laporan', t: 'Rekap kehadiran|siap dicetak PDF',
    s: 'Ringkasan status, filter tanggal, lalu cetak atau bagikan dokumennya langsung.' },
  { key: 'profil', t: 'Satu akun,|banyak peran',
    s: 'Peran, cakupan perizinan, perangkat push, dan tema tampilan dalam satu tempat.' },
];

const TARGETS = [
  { dir: 'appstore-iphone-6.9', out: [1320, 2868], css: [440, 956], dsf: 3, src: 'phone',
    q: { pt: 56, gap: 34, title: 38, subsize: 16.5, dw: 322, br: 50, bz: 10, ih: 29, iw: '31%',
         eyebrowText: 'ALHASAN APPS' } },
  { dir: 'playstore-phone', out: [1080, 1920], css: [540, 960], dsf: 2, src: 'phone',
    q: { pt: 44, gap: 28, title: 35, subsize: 16, subw: '74%', dw: 300, br: 48, bz: 10, ih: 27, iw: '31%',
         eyebrowText: 'ALHASAN APPS' } },
  { dir: 'appstore-ipad-13', out: [2064, 2752], css: [1032, 1376], dsf: 2, src: 'tablet',
    q: { pt: 66, gap: 42, title: 50, subsize: 21, subw: '66%', capgap: 14, eyebrow: 16,
         dw: 700, br: 40, bz: 14, island: 0, eyebrowText: 'ALHASAN APPS' } },
];

(async () => {
  const browser = await chromium.launch();
  for (const target of TARGETS) {
    fs.mkdirSync(`out/${target.dir}`, { recursive: true });
    const ctx = await browser.newContext({
      viewport: { width: target.css[0], height: target.css[1] },
      deviceScaleFactor: target.dsf,
    });
    const page = await ctx.newPage();
    for (let i = 0; i < SHOTS.length; i++) {
      const shot = SHOTS[i];
      const q = new URLSearchParams({
        w: target.css[0], h: target.css[1],
        img: `build/screen-${target.src}-${shot.key}.png`,
        t: shot.t, s: shot.s, ...target.q,
      });
      await page.goto(`${base}?${q}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(200);
      const file = `out/${target.dir}/${String(i + 1).padStart(2, '0')}-${shot.key}.png`;
      await page.screenshot({ path: file });
    }
    await ctx.close();
    console.log('done', target.dir);
  }
  await browser.close();
})();
