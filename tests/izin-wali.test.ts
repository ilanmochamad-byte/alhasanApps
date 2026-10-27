import assert from 'node:assert/strict';
import test from 'node:test';
import { LABEL_TAHAP, TIPE_IZIN_WALI, isianBerubah, izinWaliLinkTarget, labelPeristiwa, nadaStatus, periksaAlasan, periksaCatatan, periksaIsian, rapikan } from '../src/izin-wali/forms.ts';
import { notificationTarget } from '../src/rapor/forms.ts';

const isian = { tgl_izin: '2026-11-02', tgl_kembali: '2026-11-04', alasan: 'Acara keluarga', catatan: '' };

test('Isian izin wali mengikuti aturan server', () => {
  assert.equal(periksaIsian(isian), null);
  assert.equal(periksaIsian({ ...isian, tgl_izin: '' }), 'Tanggal izin wajib dipilih.');
  assert.equal(periksaIsian({ ...isian, tgl_kembali: '2026-02-30' }), 'Tanggal kembali wajib dipilih.');
  assert.match(periksaIsian({ ...isian, tgl_kembali: '2026-11-01' }) ?? '', /tidak boleh mendahului/);
  assert.equal(periksaIsian({ ...isian, tgl_kembali: '2026-11-02' }), null, 'izin satu hari sah');
  assert.match(periksaIsian({ ...isian, alasan: '  ab ' }) ?? '', /minimal 3/);
  assert.match(periksaIsian({ ...isian, alasan: 'x'.repeat(2001) }) ?? '', /maksimal 2000/);
  assert.match(periksaIsian({ ...isian, catatan: 'x'.repeat(1001) }) ?? '', /maksimal 1000/);
});

test('Isian dirapikan; perbaikan wajib berbeda dari versi asal', () => {
  assert.deepEqual(rapikan({ ...isian, alasan: '  Acara keluarga  ', catatan: ' ' }), isian);
  assert.equal(isianBerubah(isian, { ...isian, alasan: ' Acara keluarga ' }), false);
  assert.equal(isianBerubah(isian, { ...isian, tgl_kembali: '2026-11-05' }), true);
  assert.equal(isianBerubah(isian, { ...isian, catatan: 'Dijemput ayah' }), true);
});

test('Catatan tinjauan: perbaikan/tolak wajib, teruskan opsional', () => {
  assert.equal(periksaCatatan('teruskan', ''), null);
  assert.match(periksaCatatan('teruskan', 'x'.repeat(1001)) ?? '', /maksimal 1000/);
  assert.match(periksaCatatan('minta_perbaikan', '') ?? '', /Catatan perbaikan untuk wali wajib/);
  assert.match(periksaCatatan('tolak', 'ok') ?? '', /Alasan penolakan wajib/);
  assert.equal(periksaCatatan('tolak', 'Tanggal bentrok ujian'), null);
  assert.match(periksaAlasan(' ', 'Alasan pembatalan') ?? '', /Alasan pembatalan wajib/);
  assert.equal(periksaAlasan('Batal pulang', 'Alasan pembatalan'), null);
});

test('Penolakan pembimbing dibedakan dari keputusan murobi', () => {
  assert.equal(nadaStatus('Ditolak Pembimbing'), 'danger');
  assert.equal(nadaStatus('Disetujui'), 'primary');
  assert.equal(nadaStatus('Menunggu Pembimbing'), 'warning');
  assert.equal(labelPeristiwa('tinjauan_ditolak_pembimbing'), 'Ditolak pembimbing');
  assert.equal(labelPeristiwa('keputusan'), 'Memutuskan izin');
  assert.equal(labelPeristiwa('peristiwa_baru'), 'Peristiwa baru');
  assert.equal(LABEL_TAHAP.penetapan_pembimbing, 'Menunggu admin (pembimbing)');
});

test('Tautan notifikasi izin wali hanya membawa penunjuk', () => {
  assert.deepEqual(notificationTarget({ tipe: TIPE_IZIN_WALI, pengajuan_id: 42 }), { tipe: 'izin_wali', id: 42 });
  assert.deepEqual(notificationTarget({ tipe: 'izin_wali', pengajuan_id: '7' }), { tipe: 'izin_wali', id: 7 });
  assert.equal(notificationTarget({ tipe: 'izin_wali', pengajuan_id: 0 }), null);
  assert.equal(notificationTarget({ tipe: 'izin_wali', pengajuan_id: -3 }), null);
  assert.equal(notificationTarget({ tipe: 'izin_wali', santri: 'X' }), null);
  assert.equal(izinWaliLinkTarget('alhasanapps://izin-wali/15'), 15);
  assert.equal(izinWaliLinkTarget('alhasanapps:///izin-wali/15/'), 15);
  assert.equal(izinWaliLinkTarget('alhasanapps://izin-wali/15?santri=Nama'), 15);
  assert.equal(izinWaliLinkTarget('https://contoh.test/izin-wali/15'), null);
  assert.equal(izinWaliLinkTarget('alhasanapps://izin-wali/abc'), null);
  assert.equal(izinWaliLinkTarget('alhasanapps://izin/15'), null);
  assert.equal(izinWaliLinkTarget(null), null);
});
