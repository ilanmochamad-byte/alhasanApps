/**
 * Keadaan kisi menu Beranda.
 *
 * Kemampuan jadwal dan perizinan sudah tersedia dari profil, tetapi akses
 * pembinaan diperiksa terpisah. Pesan "tidak memiliki menu" hanya boleh muncul
 * setelah pemeriksaan itu selesai — bukan selagi dimuat atau ketika gagal.
 */
export type StatusPembinaan = 'memuat' | 'siap' | 'gagal';

export function keadaanMenuBeranda(
  jumlahMenu: number,
  pembinaan: StatusPembinaan,
): 'ada' | 'memuat' | 'gagal' | 'kosong' {
  if (jumlahMenu > 0) return 'ada';
  if (pembinaan === 'memuat') return 'memuat';
  if (pembinaan === 'gagal') return 'gagal';
  return 'kosong';
}
