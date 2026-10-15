/**
 * Status sesi jadwal untuk kartu (redesain tampilan Fase 2).
 *
 * Status ditulis sebagai teks + ikon, bukan warna saja. `perluAbsen` hanya
 * benar untuk sesi HARI INI yang absensinya belum selesai — kartu lalu
 * menampilkan penanda "Absen". Berkas ini tanpa impor agar dapat diuji Node.
 */
export type NadaStatus = 'selesai' | 'menunggu' | 'netral';

export function statusSesi(
  meeting: { status: string } | null,
  tanggal: string,
  hariIni: string,
): { label: string; nada: NadaStatus; ikon: 'check' | 'clock' | null; perluAbsen: boolean } {
  const sesiHariIni = tanggal === hariIni;
  if (meeting?.status === 'Selesai') {
    return { label: 'Absensi selesai', nada: 'selesai', ikon: 'check', perluAbsen: false };
  }
  if (meeting?.status === 'Dibuka') {
    return { label: 'Absensi dibuka', nada: 'menunggu', ikon: 'clock', perluAbsen: sesiHariIni };
  }
  if (meeting?.status === 'Draf') {
    return { label: 'Draf absensi', nada: 'menunggu', ikon: 'clock', perluAbsen: sesiHariIni };
  }
  if (sesiHariIni) {
    return { label: 'Belum diabsen', nada: 'menunggu', ikon: 'clock', perluAbsen: true };
  }
  if (tanggal > hariIni) {
    return { label: 'Belum dimulai', nada: 'netral', ikon: null, perluAbsen: false };
  }
  return { label: 'Belum dibuka', nada: 'netral', ikon: null, perluAbsen: false };
}
