// Penugasan Keamanan (lintas guru/pengurus Fase 4) — pembantu murni tanpa
// React agar dapat diuji `node --test`. Tidak ada aturan hak di sini: server
// menghitung ulang penugasan Keamanan pada setiap permintaan.

export type Nada = 'neutral' | 'primary' | 'warning' | 'danger';

/** Query string tanpa kunci kosong; urutan mengikuti objek. */
export function kueri(params: Record<string, string | number | null | undefined>): string {
  const bagian = Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && String(v) !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return bagian.length === 0 ? '' : `?${bagian.join('&')}`;
}

export const STATUS_PELANGGARAN = ['Dicatat', 'Ditindaklanjuti', 'Selesai', 'Dibatalkan'] as const;
export const STATUS_KASUS = ['Dibuka', 'Dalam Pendampingan', 'Selesai', 'Dibatalkan'] as const;
export const STATUS_KEHADIRAN = ['Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpa'] as const;

/** Label chip kasus; sama dengan halaman web Keamanan. */
export function labelStatusKasus(status: string): string {
  return status === 'Dalam Pendampingan' ? 'Dalam pendampingan' : status;
}

export function nadaPembinaan(status: string): Nada {
  if (status === 'Selesai') return 'primary';
  if (status === 'Dibatalkan') return 'neutral';
  return 'warning';
}

export function nadaKehadiran(status: string | null): Nada {
  if (status === 'Hadir') return 'primary';
  if (status === 'Alpa') return 'danger';
  if (status === null) return 'neutral';
  return 'warning';
}

export const LABEL_ASAL: Record<string, string> = { '': 'Semua asal', wali: 'Wali', pengurus: 'Pengurus' };
export const LABEL_HASIL: Record<string, string> = {
  '': 'Semua hasil', berjalan: 'Masih berjalan', disetujui: 'Disetujui', ditolak_murobi: 'Ditolak murobi/admin',
  ditolak_pembimbing: 'Ditolak pembimbing', dibatalkan: 'Dibatalkan',
};

const TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

/** Rentang tanggal opsional; galat sama dengan yang akan ditolak server. */
export function periksaRentang(dari: string, sampai: string): string | null {
  if (dari !== '' && !TANGGAL.test(dari)) return 'Tanggal awal tidak valid.';
  if (sampai !== '' && !TANGGAL.test(sampai)) return 'Tanggal akhir tidak valid.';
  if (dari !== '' && sampai !== '' && sampai < dari) return 'Tanggal akhir tidak boleh sebelum tanggal awal.';
  return null;
}

export type PenugasanProfil = { jenis: string; label: string; identitas: 'guru' | 'pengurus' | string };

/** Kelompokkan penugasan aktif menurut identitas pemegangnya (PK-1: satu akun, dua identitas). */
export function kelompokPenugasan(penugasan: PenugasanProfil[]): { guru: string[]; pengurus: string[] } {
  return {
    guru: penugasan.filter(p => p.identitas === 'guru').map(p => p.label),
    pengurus: penugasan.filter(p => p.identitas === 'pengurus').map(p => p.label),
  };
}
