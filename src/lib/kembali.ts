/**
 * Tujuan tombol ← (K-10, redesain gelombang 2).
 *
 * - Layar tab (varian `akar`) tidak punya halaman sebelumnya → tab Beranda.
 * - Layar stack kembali ke halaman sebelumnya; bila dibuka langsung tanpa
 *   riwayat (ketukan notifikasi, tautan `alhasanapps://`, web dimuat ulang),
 *   ← membuka Beranda, bukan diam atau menutup aplikasi.
 */
export type TujuanKembali = 'beranda' | 'sebelumnya';

export function tujuanKembali(varian: 'akar' | 'stack', adaRiwayat: boolean): TujuanKembali {
  if (varian === 'akar') return 'beranda';
  return adaRiwayat ? 'sebelumnya' : 'beranda';
}

export function labelKembali(varian: 'akar' | 'stack'): string {
  return varian === 'akar' ? 'Kembali ke Beranda' : 'Kembali';
}
