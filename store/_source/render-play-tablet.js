const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Slot tablet Play Console memaksa rasio 16:9 atau 9:16. Aplikasi ini dikunci
// `orientation: portrait`, jadi 9:16 potret yang dipakai — di kanvas potret
// perangkat tablet bisa dibuat jauh lebih besar sehingga teks UI tetap terbaca.
//   7"  : tiap sisi 320–3840 px  → 1080 × 1920
//   10" : tiap sisi 1080–7680 px → 1440 × 2560
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
  { dir: 'playstore-tablet-7', css: [540, 960], dsf: 2,
    q: { pt: 46, gap: 30, title: 35, subsize: 16, subw: '86%', capgap: 11, eyebrow: 13,
         dw: 468, br: 34, bz: 11, island: 0, eyebrowText: 'ALHASAN APPS' } },
  { dir: 'playstore-tablet-10', css: [720, 1280], dsf: 2,
    q: { pt: 62, gap: 40, title: 46, subsize: 21, subw: '84%', capgap: 15, eyebrow: 16,
         dw: 622, br: 44, bz: 14, island: 0, eyebrowText: 'ALHASAN APPS' } },
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
        img: `build/screen-tablet-${shot.key}.png`,
        t: shot.t, s: shot.s, ...target.q,
      });
      await page.goto(`${base}?${q}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(200);
      await page.screenshot({ path: `out/${target.dir}/${String(i + 1).padStart(2, '0')}-${shot.key}.png` });
    }
    await ctx.close();
    console.log('done', target.dir);
  }
  await browser.close();
})();
