import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { bandingkan, naikkan, nilai, perubahanAplikasi, tingkatKenaikan } from '../scripts/versi-aplikasi.mjs';

const SKRIP = join(import.meta.dirname, '..', 'scripts', 'versi-aplikasi.mjs');

test('naikkan mengikuti aturan major/minor/patch', () => {
  assert.equal(naikkan('1.2.0', 'minor'), '1.3.0');
  assert.equal(naikkan('1.2.7', 'minor'), '1.3.0');
  assert.equal(naikkan('1.2.7', 'patch'), '1.2.8');
  assert.equal(naikkan('1.2.7', 'major'), '2.0.0');
  assert.throws(() => naikkan('1.2', 'minor'));
  assert.throws(() => naikkan('1.2.0', 'besar'));
});

test('bandingkan numerik, bukan teks', () => {
  assert.equal(bandingkan('1.10.0', '1.9.0'), 1);
  assert.equal(bandingkan('1.2.0', '1.2.0'), 0);
  assert.equal(bandingkan('1.2.0', '1.3.0'), -1);
  assert.equal(tingkatKenaikan('1.2.0', '1.3.0'), 'minor');
  assert.equal(tingkatKenaikan('1.2.0', '1.4.0'), null);
});

test('perubahan dokumen/uji/skrip bukan perubahan aplikasi', () => {
  assert.deepEqual(perubahanAplikasi(['docs/a.md', 'tests/x.test.ts', 'scripts/versi-aplikasi.mjs', 'README.md', '']), []);
  assert.deepEqual(perubahanAplikasi(['src/app/meeting/[id].tsx', 'app.json', 'package.json']), ['src/app/meeting/[id].tsx', 'app.json', 'package.json']);
});

test('nilai: menolak perubahan aplikasi tanpa kenaikan, versi turun, dan lompatan', () => {
  assert.equal(nilai({ dasar: '1.2.0', kini: '1.2.0', berkasBerubah: ['src/a.tsx'] }).ok, false);
  assert.equal(nilai({ dasar: '1.2.0', kini: '1.2.0', berkasBerubah: ['docs/a.md'] }).ok, true);
  assert.equal(nilai({ dasar: '1.2.0', kini: '1.1.9', berkasBerubah: [] }).ok, false);
  assert.equal(nilai({ dasar: '1.2.0', kini: '1.0.1', berkasBerubah: ['src/a.tsx'] }).ok, false);
  assert.equal(nilai({ dasar: '1.2.0', kini: '1.4.0', berkasBerubah: ['src/a.tsx'] }).ok, false);
  assert.equal(nilai({ dasar: '1.2.0', kini: '2.1.0', berkasBerubah: ['src/a.tsx'] }).ok, false);
  assert.equal(nilai({ dasar: '1.2.0', kini: '1.3', berkasBerubah: ['src/a.tsx'] }).ok, false);
  assert.equal(nilai({ dasar: '1.2.0', kini: '1.3.0', berkasBerubah: ['src/a.tsx'] }).ok, true);
  assert.equal(nilai({ dasar: '1.2.0', kini: '1.2.1', berkasBerubah: ['src/a.tsx'] }).ok, true);
  assert.equal(nilai({ dasar: '1.2.0', kini: '2.0.0', berkasBerubah: ['src/a.tsx'] }).ok, true);
});

function repoUji(versi: string) {
  const dir = mkdtempSync(join(tmpdir(), 'versi-app-'));
  const g = (...args: string[]) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  g('init', '-q', '-b', 'main');
  g('config', 'user.email', 'uji@example.invalid');
  g('config', 'user.name', 'uji');
  writeFileSync(join(dir, 'app.json'), JSON.stringify({ expo: { name: 'x', version: versi, ios: { buildNumber: '7' } } }, null, 2) + '\n');
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src', 'a.tsx'), 'export {};\n');
  g('add', '.');
  g('commit', '-q', '-m', 'dasar');
  g('checkout', '-q', '-b', 'fitur');
  const jalan = (...args: string[]) => {
    try {
      return { kode: 0, keluar: execFileSync('node', [SKRIP, ...args, '--repo', dir, '--dasar', 'main'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
    } catch (galat) {
      const e = galat as { status: number; stdout: string; stderr: string };
      return { kode: e.status, keluar: e.stdout + e.stderr };
    }
  };
  const versiKini = () => JSON.parse(readFileSync(join(dir, 'app.json'), 'utf8')).expo.version as string;
  return { dir, g, jalan, versiKini, hapus: () => rmSync(dir, { recursive: true, force: true }) };
}

test('CLI: perubahan aplikasi tanpa kenaikan gagal; naik minor sekali; periksa lulus', () => {
  const r = repoUji('1.2.0');
  try {
    writeFileSync(join(r.dir, 'src', 'a.tsx'), 'export const x = 1;\n');
    r.g('commit', '-qam', 'fitur tanpa versi');
    const awal = r.jalan('periksa');
    assert.equal(awal.kode, 1, awal.keluar);
    assert.match(awal.keluar, /tanpa kenaikan versi/);

    assert.equal(r.jalan('naik', 'minor').kode, 0);
    assert.equal(r.versiKini(), '1.3.0');
    // Idempoten: menjalankan lagi tidak menjadi 1.4.0.
    assert.equal(r.jalan('naik', 'minor').kode, 0);
    assert.equal(r.versiKini(), '1.3.0');
    // Patch sesudah minor tidak menurunkan versi.
    assert.equal(r.jalan('naik', 'patch').kode, 0);
    assert.equal(r.versiKini(), '1.3.0');
    // Nomor build tidak disentuh.
    assert.equal(JSON.parse(readFileSync(join(r.dir, 'app.json'), 'utf8')).expo.ios.buildNumber, '7');

    // Sebelum commit, mode HEAD masih gagal; mode --kerja lulus.
    assert.equal(r.jalan('periksa').kode, 1);
    assert.equal(r.jalan('periksa', '--kerja').kode, 0);
    r.g('commit', '-qam', 'versi');
    const akhir = r.jalan('periksa');
    assert.equal(akhir.kode, 0, akhir.keluar);
    assert.match(akhir.keluar, /1\.2\.0 → 1\.3\.0 \(minor\)/);

    // Commit koreksi berikutnya dalam paket yang sama tetap lulus tanpa naik lagi.
    writeFileSync(join(r.dir, 'src', 'a.tsx'), 'export const x = 2;\n');
    r.g('commit', '-qam', 'koreksi');
    assert.equal(r.jalan('periksa').kode, 0);
  } finally {
    r.hapus();
  }
});

test('CLI: versi turun dari baseline atau lompat ditolak; perubahan dokumen saja lulus', () => {
  const r = repoUji('1.2.0');
  try {
    mkdirSync(join(r.dir, 'docs'));
    writeFileSync(join(r.dir, 'docs', 'catatan.md'), 'catatan\n');
    r.g('add', '.');
    r.g('commit', '-qm', 'dokumen');
    assert.equal(r.jalan('periksa').kode, 0);

    const turun = JSON.parse(readFileSync(join(r.dir, 'app.json'), 'utf8'));
    turun.expo.version = '1.0.1';
    writeFileSync(join(r.dir, 'app.json'), JSON.stringify(turun, null, 2) + '\n');
    r.g('commit', '-qam', 'turun');
    const hasilTurun = r.jalan('periksa');
    assert.equal(hasilTurun.kode, 1);
    assert.match(hasilTurun.keluar, /Versi turun/);
    // `naik` memperbaiki versi yang lebih rendah dari baseline.
    assert.equal(r.jalan('naik', 'minor').kode, 0);
    assert.equal(r.versiKini(), '1.3.0');

    turun.expo.version = '1.5.0';
    writeFileSync(join(r.dir, 'app.json'), JSON.stringify(turun, null, 2) + '\n');
    r.g('commit', '-qam', 'lompat');
    const lompat = r.jalan('periksa');
    assert.equal(lompat.kode, 1);
    assert.match(lompat.keluar, /bukan tepat satu kenaikan/);
  } finally {
    r.hapus();
  }
});
