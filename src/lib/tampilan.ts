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
