// Pembantu tampilan pembinaan V3 (redesain gelombang 2 Fase 4). Murni tanpa
// React agar dapat diuji `node --test`. Hanya memilih nada pil dari status
// teks server; tidak ada aturan hak atau kerahasiaan di sini.

export type NadaPembinaan = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

export function nadaStatusPembinaan(status: string): NadaPembinaan {
  if (status === 'Selesai' || status === 'Terbit') return 'success';
  if (status === 'Dibatalkan' || status === 'Ditarik') return 'danger';
  if (status === 'Dibuka' || status === 'Dalam Pendampingan' || status === 'Dicatat' || status === 'Ditindaklanjuti' || status === 'Dijadwalkan' || status === 'Dijadwalkan Ulang') return 'warning';
  if (status === 'Tidak Hadir') return 'danger';
  return 'neutral';
}

/** Penanda kerahasiaan kasus: selalu gembok + teks (server menentukan siapa melihat Rahasia). */
export function labelKerahasiaan(kerahasiaan: string | undefined | null): string | null {
  if (!kerahasiaan) return null;
  return kerahasiaan === 'Rahasia' ? 'Rahasia — pemilik kasus dan admin' : kerahasiaan === 'Internal' ? 'Internal — pembimbing dan murobi terkait' : kerahasiaan;
}
