import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ISIAN_PROFIL, alamatLengkap, base64, drafDari, galatServer, inisial, labelBinaan, labelStatus, mimeFoto, perubahanProfil,
  periksaDraf, periksaFoto, periksaPassword, rincianPenugasan, ringkasMengajar,
} from '../src/profil/format.ts';

const pribadi = {
  nama: 'Ahmad Fauzi', nip: '1987.01', nik: null, no_hp: '081234567890', tempat_lahir: null, tanggal_lahir: '1990-02-01',
  alamat_rumah: 'Jl. Melati 1', kelurahan: null, kecamatan: 'Cibeunying', kabupaten: 'Bandung', provinsi: null, email: null,
};

test('Isian yang boleh diubah sama dengan kontrak Fase 1 (tanpa username/NIP/NIK/penugasan)', () => {
  assert.deepEqual([...ISIAN_PROFIL], ['nama', 'tempat_lahir', 'tanggal_lahir', 'alamat_rumah', 'kelurahan', 'kecamatan', 'kabupaten', 'provinsi', 'no_hp', 'email']);
  for (const terlarang of ['username', 'nip', 'nik', 'roles', 'penugasan', 'kamar', 'kelas', 'mapel', 'foto', 'password']) {
    assert.equal(ISIAN_PROFIL.includes(terlarang as never), false, terlarang);
  }
});

test('Hanya kunci yang berubah dikirim; kosong dikirim sebagai string kosong', () => {
  const asal = drafDari({ pribadi });
  assert.equal(asal.tempat_lahir, '');
  assert.deepEqual(perubahanProfil(asal, asal), {});
  assert.deepEqual(perubahanProfil(asal, { ...asal, tempat_lahir: '  Garut ', kecamatan: '' }), { tempat_lahir: 'Garut', kecamatan: '' });
  assert.deepEqual(perubahanProfil(asal, { ...asal, nama: 'Ahmad Fauzi ' }), {});
  const kiriman = perubahanProfil(asal, { ...asal, ...{ username: 'x' } as never });
  assert.equal('username' in kiriman, false);
});

test('Validasi awal selaras pesan server', () => {
  const asal = drafDari({ pribadi });
  const sekarang = new Date(2026, 10, 3);
  assert.deepEqual(periksaDraf(asal, sekarang), {});
  const galat = periksaDraf({ ...asal, nama: ' ', no_hp: '12345', email: 'bukan-email', tanggal_lahir: '2027-01-01' }, sekarang);
  assert.match(galat.nama ?? '', /wajib/);
  assert.match(galat.no_hp ?? '', /diawali 0/);
  assert.match(galat.email ?? '', /email/);
  assert.match(galat.tanggal_lahir ?? '', /tidak valid/);
  assert.deepEqual(periksaDraf({ ...asal, no_hp: '0812-3456-7890' }, sekarang), {});
  assert.match(periksaDraf({ ...asal, alamat_rumah: 'x'.repeat(256) }, sekarang).alamat_rumah ?? '', /255/);
});

test('Galat server per isian; nilai bukan teks diabaikan', () => {
  assert.deepEqual(galatServer({ email: 'Email sudah dipakai akun lain.', username: 'Tidak dapat diubah melalui profil.', x: 1 }),
    { email: 'Email sudah dipakai akun lain.', username: 'Tidak dapat diubah melalui profil.' });
  assert.deepEqual(galatServer(undefined), {});
});

test('Aturan password sama dengan website: 12 karakter, besar, kecil, angka, ≤72 byte, sama', () => {
  assert.deepEqual(periksaPassword('lama', 'PasswordBaru123', 'PasswordBaru123'), {});
  assert.ok(periksaPassword('', 'PasswordBaru123', 'PasswordBaru123').password_saat_ini);
  assert.ok(periksaPassword('lama', 'Pendek1A', 'Pendek1A').password_baru);
  assert.ok(periksaPassword('lama', 'semuakecil1234', 'semuakecil1234').password_baru);
  assert.ok(periksaPassword('lama', 'TANPAANGKAabcd', 'TANPAANGKAabcd').password_baru);
  const panjang = `Aa1${'é'.repeat(35)}`;
  assert.match(periksaPassword('lama', panjang, panjang).password_baru ?? '', /72 byte/);
  assert.ok(periksaPassword('lama', 'PasswordBaru123', 'PasswordBaru124').konfirmasi_password);
});

test('Inisial, status tanpa duplikat, binaan kamar vs kelas tanpa nama rekaan', () => {
  assert.equal(inisial('ahmad fauzi rahman'), 'AF');
  assert.equal(inisial('  '), '?');
  assert.deepEqual(labelStatus([
    { kode: 'guru', label: 'Guru', jenis: 'peran' }, { kode: 'murobi', label: 'Murobi', jenis: 'penugasan' },
    { kode: 'pembimbing', label: 'Pembimbing', jenis: 'penugasan' }, { kode: 'guru', label: 'Guru', jenis: 'peran' },
  ]), ['Guru', 'Murobi', 'Pembimbing']);
  assert.deepEqual(labelBinaan([]), []);
  assert.deepEqual(labelBinaan([
    { peran: 'Murobi', jenis: 'murobi', tipe: 'Kamar', id: 2, nama: 'Al-Fatih' },
    { peran: 'Pembimbing', jenis: 'pembimbing', tipe: 'Kelas', id: 7, nama: '1 IBTIDA PA' },
  ]), ['Murobi · Kamar Al-Fatih', 'Pembimbing · Kelas 1 IBTIDA PA']);
});

test('Mapel–kelas dikelompokkan per mapel, kombinasi ganda dipertahankan', () => {
  assert.deepEqual(ringkasMengajar([
    { mata_pelajaran_id: 56, mata_pelajaran: 'Fiqih', kelas_id: 1, kelas: '1 IBTIDA PA' },
    { mata_pelajaran_id: 57, mata_pelajaran: 'Nahwu', kelas_id: 1, kelas: '1 IBTIDA PA' },
    { mata_pelajaran_id: 56, mata_pelajaran: 'Fiqih', kelas_id: 2, kelas: '1 IBTIDA PI' },
  ]), [{ mapel: 'Fiqih', kelas: ['1 IBTIDA PA', '1 IBTIDA PI'] }, { mapel: 'Nahwu', kelas: ['1 IBTIDA PA'] }]);
});

test('Rincian penugasan menyebut target, mapel–kelas, atau seluruh cakupan', () => {
  const ta = { id: 1, nama: '2026/2027 Ganjil' };
  const dasar = { tahun_ajaran: ta, target: null, mata_pelajaran: null, kelas: null, jenjang: null, gelombang: null, tanggal_mulai: null, tanggal_selesai: null };
  assert.deepEqual(rincianPenugasan({ jenis: 'murobi', label: 'Murobi', identitas: 'guru', rincian: [
    { ...dasar, id: 1, target: { tipe: 'Kamar', id: 2, nama: 'Al-Fatih' } },
  ] }), ['Kamar Al-Fatih · 2026/2027 Ganjil']);
  assert.deepEqual(rincianPenugasan({ jenis: 'guru_mapel', label: 'Guru Mata Pelajaran', identitas: 'guru', rincian: [
    { ...dasar, id: 2, mata_pelajaran: { id: 56, nama: 'Fiqih' }, kelas: { id: 1, nama: '1 IBTIDA PA' } },
  ] }), ['Fiqih — 1 IBTIDA PA · 2026/2027 Ganjil']);
  assert.deepEqual(rincianPenugasan({ jenis: 'keamanan', label: 'Keamanan', identitas: 'pengurus', rincian: [{ ...dasar, id: 3, tahun_ajaran: { id: 0, nama: '' } }] }),
    ['Seluruh cakupan']);
});

test('Alamat lengkap satu baris dari isian berjenjang', () => {
  assert.equal(alamatLengkap(pribadi), 'Jl. Melati 1, Cibeunying, Bandung');
  assert.equal(alamatLengkap({ ...pribadi, alamat_rumah: null, kecamatan: null, kabupaten: null }), null);
});

test('Foto: hanya JPEG/PNG/WebP ≤ 2 MiB; mime dari ekstensi bila tidak dilaporkan', () => {
  assert.equal(mimeFoto('image/jpeg', null), 'image/jpeg');
  assert.equal(mimeFoto('image/jpg', null), 'image/jpeg');
  assert.equal(mimeFoto('image/gif', 'a.gif'), null);
  assert.equal(mimeFoto('image/heic', 'a.heic'), null);
  assert.equal(mimeFoto(null, null, 'file:///cache/ImagePicker/abc.PNG'), 'image/png');
  assert.equal(mimeFoto(undefined, 'foto.webp'), 'image/webp');
  assert.equal(mimeFoto(null, null, 'file:///x/tanpa-ekstensi'), null);
  assert.equal(periksaFoto('image/png', 2 * 1024 * 1024), null);
  assert.match(periksaFoto('image/png', 2 * 1024 * 1024 + 1) ?? '', /2 MB/);
  assert.match(periksaFoto(null, 10) ?? '', /JPEG/);
});

test('Base64 tanpa btoa sama dengan Buffer', () => {
  for (const panjang of [0, 1, 2, 3, 4, 5, 255, 1000]) {
    const bytes = Uint8Array.from({ length: panjang }, (_, i) => (i * 37 + 11) % 256);
    assert.equal(base64(bytes), Buffer.from(bytes).toString('base64'), String(panjang));
  }
});
