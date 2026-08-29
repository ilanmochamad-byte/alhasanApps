/**
 * Bantuan tanggal.
 *
 * SATU aturan yang tidak boleh dilanggar: format kirim ke server selalu
 * `YYYY-MM-DD` yang disusun dari komponen tanggal LOKAL. Memakai
 * `toISOString()` akan menggeser hari bagi pengguna di zona waktu timur
 * (WIB = UTC+7): tanggal 1 September pukul 00.00 WIB menjadi 31 Agustus dalam
 * UTC. Semua endpoint izin, jadwal, dan laporan menerima string yang sama
 * seperti sebelumnya, jadi mengganti kolom ketik dengan pemilih kalender
 * tidak mengubah apa pun di sisi API maupun basis data.
 */

const POLA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** `Date` → `YYYY-MM-DD` memakai komponen tanggal lokal. */
export function isoDate(date: Date): string {
  const bulan = String(date.getMonth() + 1).padStart(2, '0');
  const hari = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${bulan}-${hari}`;
}

/** `YYYY-MM-DD` → `Date` pada tengah malam waktu lokal; `null` bila tidak valid. */
export function parseIsoDate(value: string): Date | null {
  if (!POLA_ISO.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isIsoDate(value: string): boolean {
  return POLA_ISO.test(value) && parseIsoDate(value) !== null;
}

/** Hari ini dalam format kirim. */
export function isoHariIni(): string {
  return isoDate(new Date());
}

/** `YYYY-MM-DD` beberapa hari dari sekarang. */
export function isoTambahHari(jumlah: number): string {
  const date = new Date();
  date.setDate(date.getDate() + jumlah);
  return isoDate(date);
}

/** Tanggal pertama bulan berjalan dalam format kirim. */
export function isoAwalBulan(): string {
  const date = new Date();
  date.setDate(1);
  return isoDate(date);
}

/** "Sabtu, 29 Agustus 2026" */
export function formatPanjang(value: string): string {
  const parsed = parseIsoDate(value);
  if (!parsed) return value;
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
}

/** "29 Agu 2026" */
export function formatSedang(value: string): string {
  const parsed = parseIsoDate(value);
  if (!parsed) return value;
  return parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "29 Agu" */
export function formatPendek(value: string): string {
  const parsed = parseIsoDate(value);
  if (!parsed) return value;
  return parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

/** Lama inklusif dalam hari; `null` bila salah satu tanggal tidak valid. */
export function lamaHari(dari: string, sampai: string): number | null {
  const a = parseIsoDate(dari);
  const b = parseIsoDate(sampai);
  if (!a || !b) return null;
  const hari = Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
  return hari > 0 ? hari : null;
}
