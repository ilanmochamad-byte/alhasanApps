/**
 * Pembantu murni komponen redesain gelombang 2 (dapat diuji di Node).
 */

/**
 * Inisial nama untuk avatar (K-5: tanpa foto santri). Kata yang tidak diawali
 * huruf (mis. nomor urut) dilewati; huruf pertama kata pertama dan terakhir.
 */
export function inisialNama(nama: string): string {
  const bagian = nama.trim().split(/\s+/).filter((kata) => /^\p{L}/u.test(kata));
  if (bagian.length === 0) return '?';
  return (bagian[0][0] + (bagian.length > 1 ? bagian[bagian.length - 1][0] : '')).toUpperCase();
}

/** Tinggi relatif batang (0–1) terhadap nilai terbesar; nilai ≤ 0 atau bukan angka → 0. */
export function tinggiBatang(values: number[]): number[] {
  const maks = Math.max(0, ...values.filter((v) => Number.isFinite(v)));
  return values.map((v) => (maks > 0 && Number.isFinite(v) && v > 0 ? v / maks : 0));
}

/** Membagi butir menjadi baris kisi berisi `kolom` butir. */
export function barisKisi<T>(items: T[], kolom: number): T[][] {
  const baris: T[][] = [];
  for (let i = 0; i < items.length; i += kolom) baris.push(items.slice(i, i + kolom));
  return baris;
}

/**
 * Waktu relatif untuk daftar notifikasi ("Baru saja", "5 menit lalu",
 * "3 jam lalu", "Kemarin", "4 hari lalu"). Masukan adalah waktu server
 * `YYYY-MM-DD HH:mm:ss` dalam zona pesantren (WIB, UTC+7). Di luar tujuh hari,
 * waktu yang akan datang, atau format tak dikenal → teks asli dikembalikan,
 * sehingga tampilan tidak pernah mengarang waktu.
 */
export function waktuRelatif(waktuServer: string, sekarang: Date = new Date()): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(waktuServer.trim());
  if (!m) return waktuServer;
  const saat = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]) - 7, Number(m[5]), Number(m[6] ?? 0));
  const selisih = Math.floor((sekarang.getTime() - saat) / 1000);
  if (!Number.isFinite(selisih) || selisih < 0) return waktuServer;
  if (selisih < 60) return 'Baru saja';
  if (selisih < 3600) return `${Math.floor(selisih / 60)} menit lalu`;
  if (selisih < 86400) return `${Math.floor(selisih / 3600)} jam lalu`;
  const hari = Math.floor(selisih / 86400);
  if (hari === 1) return 'Kemarin';
  if (hari <= 7) return `${hari} hari lalu`;
  return waktuServer;
}

/**
 * K-8: FAB "Ajukan izin" (ikon + teks) boleh melebar pada teks sistem besar,
 * tetapi bila lebarnya dapat melewati setengah layar dipakai alternatif yang
 * disetujui (tombol lebar penuh di atas kotak cari). Perkiraan lebar: ikon,
 * jarak, dan padding 70 pt + teks "Ajukan izin" ±84 pt pada skala 1,0.
 */
export function fabMelewatiSetengahLayar(skalaTeks: number, lebarLayar: number): boolean {
  return 70 + 84 * skalaTeks > lebarLayar / 2;
}

/**
 * Jarak atas isi layar TAB yang area gulirnya memenuhi layar. Di iOS, native
 * tabs sudah memberi area gulir pertama inset area aman atas secara otomatis
 * (walau `contentInsetAdjustmentBehavior="never"`), sehingga menambah
 * `insets.top` lagi menghasilkan ruang kosong ganda di atas kepala layar.
 * Android dan web tidak memberi inset otomatis itu.
 */
export function jarakAtasLayarTab(platform: string, insetAtas: number): number {
  return platform === 'ios' ? 8 : insetAtas + 8;
}
