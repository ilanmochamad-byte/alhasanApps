// Pembantu murni profil pribadi (PRD-PROFIL-IMPORT Fase 2, diuji
// `tests/profil.test.ts`). Tidak ada aturan hak di sini: status, penugasan,
// binaan, dan mapel–kelas berasal dari server; validasi di bawah hanya
// petunjuk awal — server tetap memeriksa ulang setiap isian.

import type { ProfilBinaan, ProfilIsian, ProfilMengajar, ProfilPenugasan, ProfilPribadi } from '../api/types';

/** Isian yang boleh diubah pemilik akun (sama dengan `ProfilData::DIRI`). */
export const ISIAN_PROFIL: readonly ProfilIsian[] = [
  'nama', 'tempat_lahir', 'tanggal_lahir', 'alamat_rumah', 'kelurahan', 'kecamatan', 'kabupaten', 'provinsi', 'no_hp', 'email',
];

export const LABEL_ISIAN: Record<ProfilIsian, string> = {
  nama: 'Nama lengkap',
  tempat_lahir: 'Tempat lahir',
  tanggal_lahir: 'Tanggal lahir',
  alamat_rumah: 'Alamat rumah',
  kelurahan: 'Kelurahan/Desa',
  kecamatan: 'Kecamatan',
  kabupaten: 'Kabupaten/Kota',
  provinsi: 'Provinsi',
  no_hp: 'No. HP',
  email: 'Email',
};

const PANJANG: Partial<Record<ProfilIsian, number>> = {
  nama: 100, tempat_lahir: 100, alamat_rumah: 255, kelurahan: 100, kecamatan: 100, kabupaten: 100, provinsi: 100, email: 191,
};

export type DrafProfil = Record<ProfilIsian, string>;

/** Draf formulir dari profil server; `null` menjadi kosong. */
export function drafDari(profil: Pick<ProfilPribadi, 'pribadi'>): DrafProfil {
  const draf = {} as DrafProfil;
  for (const isian of ISIAN_PROFIL) draf[isian] = profil.pribadi[isian] ?? '';
  return draf;
}

/**
 * Kunci yang berubah saja (edit diri hanya mengirim kunci yang dikirim). Isian
 * yang dikosongkan dikirim sebagai `''` agar server mengosongkannya.
 */
export function perubahanProfil(asal: DrafProfil, draf: DrafProfil): Partial<Record<ProfilIsian, string>> {
  const hasil: Partial<Record<ProfilIsian, string>> = {};
  for (const isian of ISIAN_PROFIL) {
    const baru = draf[isian].trim();
    if (baru !== asal[isian].trim()) hasil[isian] = baru;
  }
  return hasil;
}

/** Tanggal lokal `YYYY-MM-DD` tanpa Intl. */
export function hariIni(sekarang = new Date()): string {
  const dua = (n: number) => String(n).padStart(2, '0');
  return `${sekarang.getFullYear()}-${dua(sekarang.getMonth() + 1)}-${dua(sekarang.getDate())}`;
}

/** Petunjuk galat per isian sebelum dikirim; pesan selaras dengan server. */
export function periksaDraf(draf: DrafProfil, sekarang = new Date()): Partial<Record<ProfilIsian, string>> {
  const galat: Partial<Record<ProfilIsian, string>> = {};
  if (draf.nama.trim() === '') galat.nama = 'Nama lengkap wajib diisi.';
  for (const isian of ISIAN_PROFIL) {
    const batas = PANJANG[isian];
    if (batas !== undefined && draf[isian].trim().length > batas) galat[isian] = `${LABEL_ISIAN[isian]} maksimal ${batas} karakter.`;
  }
  const hp = draf.no_hp.replace(/[\s.-]/g, '');
  if (hp !== '' && !/^0[0-9]{8,15}$/.test(hp)) galat.no_hp = 'Nomor HP harus berupa 9–16 digit dan diawali 0.';
  const email = draf.email.trim();
  if (email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) galat.email = 'Format email tidak valid.';
  const tanggal = draf.tanggal_lahir.trim();
  if (tanggal !== '' && (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || tanggal < '1900-01-01' || tanggal > hariIni(sekarang))) {
    galat.tanggal_lahir = 'Tanggal lahir tidak valid.';
  }
  return galat;
}

/** `error.details` server → pesan per isian (kunci tak dikenal diabaikan). */
export function galatServer(details: Record<string, unknown> | undefined): Record<string, string> {
  const hasil: Record<string, string> = {};
  for (const [kunci, pesan] of Object.entries(details ?? {})) {
    if (typeof pesan === 'string' && pesan !== '') hasil[kunci] = pesan;
  }
  return hasil;
}

export const ATURAN_PASSWORD = 'Minimal 12 karakter dengan huruf besar, huruf kecil, dan angka.';

function panjangByte(teks: string): number {
  let n = 0;
  for (const ch of teks) {
    const kode = ch.codePointAt(0) ?? 0;
    n += kode < 0x80 ? 1 : kode < 0x800 ? 2 : kode < 0x10000 ? 3 : 4;
  }
  return n;
}

export type IsianPassword = 'password_saat_ini' | 'password_baru' | 'konfirmasi_password';

/** Aturan sama dengan website/Fase 1; server tetap penentu. */
export function periksaPassword(saatIni: string, baru: string, konfirmasi: string): Partial<Record<IsianPassword, string>> {
  const galat: Partial<Record<IsianPassword, string>> = {};
  if (saatIni === '') galat.password_saat_ini = 'Password saat ini wajib diisi.';
  if (baru.length < 12 || !/[A-Z]/.test(baru) || !/[a-z]/.test(baru) || !/[0-9]/.test(baru)) {
    galat.password_baru = `Password baru belum memenuhi aturan. ${ATURAN_PASSWORD}`;
  } else if (panjangByte(baru) > 72 || baru.includes('\u0000')) {
    galat.password_baru = 'Password baru maksimal 72 byte dan tidak boleh memuat karakter NUL.';
  }
  if (konfirmasi !== baru) galat.konfirmasi_password = 'Ulangan password baru tidak sama.';
  return galat;
}

/** Inisial maksimal dua huruf; cadangan bila server belum mengirim `foto.inisial`. */
export function inisial(nama: string): string {
  const bagian = nama.trim().split(/\s+/).filter(Boolean);
  if (bagian.length === 0) return '?';
  return (bagian[0][0] + (bagian[1]?.[0] ?? '')).toUpperCase();
}

/** Label status tanpa duplikat, urutan server dipertahankan. */
export function labelStatus(status: ProfilPribadi['status']): string[] {
  return [...new Set(status.map(s => s.label).filter(Boolean))];
}

/**
 * Target binaan untuk kartu: "Murobi · Kamar Al-Fatih", "Pembimbing · Kelas
 * 1 IBTIDA PA". Hanya dari `binaan` server — akun tanpa target tidak diberi
 * nama kamar rekaan.
 */
export function labelBinaan(binaan: ProfilBinaan[]): string[] {
  return [...new Set(binaan.map(b => `${b.peran} · ${b.tipe} ${b.nama || `#${b.id}`}`))];
}

/** Pasangan mapel–kelas dikelompokkan per mapel: "Fiqih — 1 IBTIDA PA, 2 IBTIDA PA". */
export function ringkasMengajar(mengajar: ProfilMengajar[]): { mapel: string; kelas: string[] }[] {
  const kelompok = new Map<string, { mapel: string; kelas: string[] }>();
  for (const m of mengajar) {
    const kunci = String(m.mata_pelajaran_id);
    const entri = kelompok.get(kunci) ?? { mapel: m.mata_pelajaran || `Mapel #${m.mata_pelajaran_id}`, kelas: [] };
    const kelas = m.kelas || `Kelas #${m.kelas_id}`;
    if (!entri.kelas.includes(kelas)) entri.kelas.push(kelas);
    kelompok.set(kunci, entri);
  }
  return [...kelompok.values()];
}

/** Satu kalimat rincian per penugasan (target/mapel–kelas/jenjang/gelombang + tahun ajaran). */
export function rincianPenugasan(p: ProfilPenugasan): string[] {
  return p.rincian.map(r => {
    const bagian: string[] = [];
    if (r.target) bagian.push(`${r.target.tipe} ${r.target.nama || `#${r.target.id}`}`);
    if (r.mata_pelajaran && r.kelas) bagian.push(`${r.mata_pelajaran.nama} — ${r.kelas.nama}`);
    if (r.jenjang) bagian.push(`Jenjang ${r.jenjang}`);
    if (r.gelombang) bagian.push(`Gelombang ${r.gelombang}`);
    if (bagian.length === 0) bagian.push('Seluruh cakupan');
    if (r.tahun_ajaran?.nama) bagian.push(r.tahun_ajaran.nama);
    return bagian.join(' · ');
  });
}

/** Alamat satu baris dari isian berjenjang. */
export function alamatLengkap(p: ProfilPribadi['pribadi']): string | null {
  const bagian = [p.alamat_rumah, p.kelurahan, p.kecamatan, p.kabupaten, p.provinsi].map(v => (v ?? '').trim()).filter(Boolean);
  return bagian.length === 0 ? null : bagian.join(', ');
}

export const BATAS_FOTO = 2 * 1024 * 1024;
const MIME_FOTO = ['image/jpeg', 'image/png', 'image/webp'];

/** Jenis berkas dari mime pemilih, atau dari ekstensi bila pemilih tidak melaporkannya. */
export function mimeFoto(mime: string | null | undefined, nama: string | null | undefined, uri = ''): string | null {
  const m = (mime ?? '').toLowerCase();
  if (m === 'image/jpg') return 'image/jpeg';
  if (MIME_FOTO.includes(m)) return m;
  if (m !== '') return null;
  const ekstensi = (nama || uri).toLowerCase().match(/\.([a-z0-9]+)(?:[?#].*)?$/)?.[1];
  return ekstensi === 'jpg' || ekstensi === 'jpeg' ? 'image/jpeg' : ekstensi === 'png' ? 'image/png' : ekstensi === 'webp' ? 'image/webp' : null;
}

/** Pemeriksaan awal foto (PI-5); server tetap memeriksa isi berkas. */
export function periksaFoto(mime: string | null, ukuran: number | null | undefined): string | null {
  if (mime === null) return 'Foto harus berformat JPEG, PNG, atau WebP.';
  if (typeof ukuran === 'number' && ukuran > BATAS_FOTO) return 'Ukuran foto maksimal 2 MB. Pilih foto lain atau potong lebih kecil.';
  return null;
}

const ABJAD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Base64 tanpa `btoa` agar sama di Hermes dan web. */
export function base64(bytes: Uint8Array): string {
  let hasil = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (a << 16) | (b << 8) | c;
    hasil += ABJAD[(n >> 18) & 63] + ABJAD[(n >> 12) & 63]
      + (i + 1 < bytes.length ? ABJAD[(n >> 6) & 63] : '=')
      + (i + 2 < bytes.length ? ABJAD[n & 63] : '=');
  }
  return hasil;
}
