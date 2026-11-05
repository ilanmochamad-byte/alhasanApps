#!/usr/bin/env node
/**
 * Aturan versi aplikasi (keputusan Human Developer 5 November 2026).
 *
 * `expo.version` di app.json adalah versi yang terlihat pengguna, berpola
 * major.minor.patch:
 *   - major: perubahan besar / tidak kompatibel,
 *   - minor: fitur sedang,
 *   - patch: koreksi kecil.
 * Setiap paket pekerjaan aplikasi yang mengubah perilaku menaikkan versi SATU
 * KALI terhadap baseline branch (biasanya `origin/main`), bukan per commit
 * koreksi. Versi tidak boleh turun dari baseline. Nomor build Android/iOS
 * (versionCode/buildNumber) diurus EAS (`appVersionSource: remote`,
 * `autoIncrement`) dan BUKAN versi pengguna.
 *
 * Perintah:
 *   node scripts/versi-aplikasi.mjs naik <major|minor|patch> [--dasar <ref>]
 *       Menulis app.json = baseline + satu kenaikan. Idempoten: menjalankannya
 *       lagi dalam paket yang sama tidak menaikkan dua kali. Tidak pernah
 *       menurunkan versi yang sudah lebih tinggi.
 *   node scripts/versi-aplikasi.mjs periksa [--dasar <ref>] [--kerja]
 *       Gagal (exit 1) bila versi tidak valid, turun dari baseline, melompat
 *       lebih dari satu kenaikan, atau ada perubahan aplikasi tanpa kenaikan.
 *       Tanpa --kerja: membandingkan commit HEAD dengan baseline (seperti CI).
 *       Dengan --kerja: memakai isi berkas di salinan kerja.
 *   node scripts/versi-aplikasi.mjs tampil [--dasar <ref>]
 *
 * Opsi `--repo <dir>` dan variabel VERSI_APP_REPO hanya untuk pengujian.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const POLA = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const TINGKAT = ['major', 'minor', 'patch'];

/** Berkas yang TIDAK dianggap mengubah perilaku aplikasi. */
const BUKAN_APLIKASI = [
  /^docs\//,
  /^tests\//,
  /^scripts\//,
  /^\.github\//,
  /^\.vscode\//,
  /^\.claude\//,
  /^\.agents\//,
  /\.md$/i,
  /^LICENSE$/,
  /^\.gitignore$/,
  /^eslint\.config\.js$/,
  /^skills-lock\.json$/,
];

export function urai(versi) {
  const m = POLA.exec(String(versi ?? ''));
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function bandingkan(a, b) {
  const x = urai(a);
  const y = urai(b);
  if (!x || !y) throw new Error(`Versi tidak valid: ${!x ? a : b}`);
  for (let i = 0; i < 3; i += 1) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
}

export function naikkan(versi, tingkat) {
  const v = urai(versi);
  if (!v) throw new Error(`Versi baseline tidak valid: ${versi}`);
  if (tingkat === 'major') return `${v[0] + 1}.0.0`;
  if (tingkat === 'minor') return `${v[0]}.${v[1] + 1}.0`;
  if (tingkat === 'patch') return `${v[0]}.${v[1]}.${v[2] + 1}`;
  throw new Error(`Tingkat harus major, minor, atau patch (bukan ${tingkat}).`);
}

/** Tingkat kenaikan dari `dasar` ke `kini`, atau null bila bukan tepat satu kenaikan. */
export function tingkatKenaikan(dasar, kini) {
  for (const t of TINGKAT) if (naikkan(dasar, t) === kini) return t;
  return null;
}

export function perubahanAplikasi(berkas) {
  return berkas.filter((f) => f !== '' && !BUKAN_APLIKASI.some((pola) => pola.test(f)));
}

/**
 * Inti keputusan `periksa` (murni, untuk diuji):
 * `{ dasar, kini, berkasBerubah }` → `{ ok, pesan }`. app.json sendiri
 * dihitung sebagai perubahan aplikasi.
 */
export function nilai({ dasar, kini, berkasBerubah }) {
  if (!urai(kini)) return { ok: false, pesan: `expo.version "${kini}" bukan pola major.minor.patch.` };
  if (!urai(dasar)) return { ok: false, pesan: `Versi baseline "${dasar}" bukan pola major.minor.patch.` };
  const arah = bandingkan(kini, dasar);
  if (arah < 0) return { ok: false, pesan: `Versi turun: ${kini} lebih rendah dari baseline ${dasar}.` };
  const aplikasi = perubahanAplikasi(berkasBerubah);
  if (arah === 0) {
    if (aplikasi.length === 0) return { ok: true, pesan: `Tidak ada perubahan aplikasi; versi tetap ${kini}.` };
    return {
      ok: false,
      pesan:
        `Ada perubahan aplikasi tanpa kenaikan versi (tetap ${kini}). Jalankan ` +
        '`npm run versi:naik -- <major|minor|patch>` satu kali untuk paket ini. Berkas: ' +
        aplikasi.slice(0, 10).join(', ') +
        (aplikasi.length > 10 ? ` (+${aplikasi.length - 10} lagi)` : ''),
    };
  }
  const tingkat = tingkatKenaikan(dasar, kini);
  if (!tingkat) {
    return {
      ok: false,
      pesan: `Kenaikan ${dasar} → ${kini} bukan tepat satu kenaikan major/minor/patch (harus ${TINGKAT.map((t) => naikkan(dasar, t)).join(', ')}).`,
    };
  }
  return { ok: true, pesan: `Versi ${dasar} → ${kini} (${tingkat}).` };
}

function git(repo, args) {
  return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function versiDari(teksAppJson, sumber) {
  let json;
  try {
    json = JSON.parse(teksAppJson);
  } catch {
    throw new Error(`app.json pada ${sumber} bukan JSON valid.`);
  }
  return json?.expo?.version;
}

function bacaOpsi(argv) {
  const opsi = { dasar: process.env.VERSI_APP_DASAR || 'origin/main', kerja: false, repo: process.env.VERSI_APP_REPO || process.cwd(), posisi: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dasar') opsi.dasar = argv[++i];
    else if (a === '--kerja') opsi.kerja = true;
    else if (a === '--repo') opsi.repo = argv[++i];
    else opsi.posisi.push(a);
  }
  opsi.repo = resolve(opsi.repo);
  return opsi;
}

function versiDasar(opsi) {
  try {
    return versiDari(git(opsi.repo, ['show', `${opsi.dasar}:app.json`]), opsi.dasar);
  } catch (galat) {
    throw new Error(`Tidak dapat membaca app.json pada baseline ${opsi.dasar}. Jalankan \`git fetch origin\` atau beri --dasar <ref>. (${galat.message.split('\n')[0]})`);
  }
}

function utama(argv) {
  const opsi = bacaOpsi(argv);
  const [perintah, tingkat] = opsi.posisi;
  const jalurApp = join(opsi.repo, 'app.json');

  if (perintah === 'tampil') {
    const kini = versiDari(readFileSync(jalurApp, 'utf8'), 'salinan kerja');
    console.log(`baseline ${opsi.dasar}: ${versiDasar(opsi)}\nsalinan kerja: ${kini}\nNomor build Android/iOS diurus EAS (appVersionSource remote), bukan expo.version.`);
    return 0;
  }

  if (perintah === 'naik') {
    if (!TINGKAT.includes(tingkat)) throw new Error('Gunakan: naik <major|minor|patch>');
    const dasar = versiDasar(opsi);
    const teks = readFileSync(jalurApp, 'utf8');
    const kini = versiDari(teks, 'salinan kerja');
    const target = naikkan(dasar, tingkat);
    if (urai(kini) && bandingkan(kini, target) >= 0) {
      console.log(`Tidak diubah: versi ${kini} sudah ≥ ${target} (baseline ${dasar} + ${tingkat}). Satu kenaikan per paket.`);
      return 0;
    }
    const json = JSON.parse(teks);
    json.expo.version = target;
    const akhir = teks.endsWith('\n') ? '\n' : '';
    writeFileSync(jalurApp, JSON.stringify(json, null, 2) + akhir);
    console.log(`expo.version: ${kini} → ${target} (baseline ${opsi.dasar} ${dasar}, ${tingkat}).`);
    return 0;
  }

  if (perintah === 'periksa') {
    const dasar = versiDasar(opsi);
    const mergeBase = git(opsi.repo, ['merge-base', opsi.dasar, 'HEAD']).trim();
    const berkasBerubah = (
      opsi.kerja
        ? git(opsi.repo, ['diff', '--name-only', mergeBase]) + git(opsi.repo, ['ls-files', '--others', '--exclude-standard'])
        : git(opsi.repo, ['diff', '--name-only', mergeBase, 'HEAD'])
    )
      .split('\n')
      .map((f) => f.trim());
    const kini = opsi.kerja
      ? versiDari(readFileSync(jalurApp, 'utf8'), 'salinan kerja')
      : versiDari(git(opsi.repo, ['show', 'HEAD:app.json']), 'HEAD');
    const hasil = nilai({ dasar, kini, berkasBerubah });
    console.log(`${hasil.ok ? 'LULUS' : 'GAGAL'}: ${hasil.pesan}`);
    return hasil.ok ? 0 : 1;
  }

  console.error('Gunakan: versi-aplikasi.mjs <naik major|minor|patch | periksa [--kerja] | tampil> [--dasar <ref>]');
  return 2;
}

const langsung = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (langsung) {
  try {
    process.exitCode = utama(process.argv.slice(2));
  } catch (galat) {
    console.error(`GAGAL: ${galat.message}`);
    process.exitCode = 2;
  }
}
