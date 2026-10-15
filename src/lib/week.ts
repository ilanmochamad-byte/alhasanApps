/**
 * Perhitungan pekan untuk deretan tanggal (redesain tampilan).
 *
 * Pekan dimulai Senin, sesuai kebiasaan jadwal pesantren. Semua nilai memakai
 * format kirim `YYYY-MM-DD` dari komponen tanggal LOKAL (lihat `date.ts`);
 * berkas ini sengaja tanpa impor agar dapat diuji langsung oleh Node.
 */

function keIso(date: Date): string {
  const bulan = String(date.getMonth() + 1).padStart(2, '0');
  const hari = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${bulan}-${hari}`;
}

function dariIso(value: string): Date {
  const [tahun, bulan, hari] = value.split('-').map(Number);
  return new Date(tahun, bulan - 1, hari);
}

/** Tujuh tanggal Senin–Minggu dari pekan yang memuat `iso`. */
export function hariPekan(iso: string): string[] {
  const date = dariIso(iso);
  // getDay(): Minggu = 0. Geser agar Senin menjadi hari pertama.
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const hari = new Date(date);
    hari.setDate(date.getDate() + index);
    return keIso(hari);
  });
}

/** Tanggal yang sama digeser sejumlah pekan (negatif = mundur). */
export function geserPekan(iso: string, jumlah: number): string {
  const date = dariIso(iso);
  date.setDate(date.getDate() + jumlah * 7);
  return keIso(date);
}
