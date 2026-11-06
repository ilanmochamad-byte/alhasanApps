/**
 * "Perbarui daftar santri" pada pertemuan berstatus Dibuka (perbaikan peserta
 * absensi, 6 November 2026). Server menyelaraskan peserta dengan penempatan
 * kelas aktif saat ini; aplikasi hanya menggabungkan draf dan menampilkan
 * ringkasan perubahan.
 */

export type DrafSantri = { status: string; notes: string };

export type PerubahanPeserta = {
  added: number[];
  removed: number[];
  kept_with_attendance: number[];
};

type PesertaRingkas = {
  student_id: number;
  attendance?: { status: string; notes: string | null } | null;
};

/**
 * Draf baru untuk daftar peserta terbaru: isian yang sudah diubah guru untuk
 * santri yang masih tercantum dipertahankan; santri baru memakai absensi
 * tersimpan bila ada, selain itu "Hadir"; santri yang dikeluarkan dibuang.
 */
export function gabungDrafPeserta<T extends DrafSantri>(
  drafLama: Record<number, T>,
  peserta: PesertaRingkas[],
  bawaan: (s: PesertaRingkas) => T,
): Record<number, T> {
  const hasil: Record<number, T> = {};
  for (const s of peserta) {
    hasil[s.student_id] = drafLama[s.student_id] ?? bawaan(s);
  }
  return hasil;
}

/** Kalimat ringkas hasil pembaruan untuk ditampilkan kepada guru. */
export function ringkasPerubahanPeserta(perubahan: PerubahanPeserta | undefined): string {
  if (!perubahan) return 'Daftar santri diperbarui.';
  const bagian: string[] = [];
  if (perubahan.added.length > 0) bagian.push(`${perubahan.added.length} santri ditambahkan`);
  if (perubahan.removed.length > 0) bagian.push(`${perubahan.removed.length} santri dikeluarkan`);
  if (perubahan.kept_with_attendance.length > 0) {
    bagian.push(`${perubahan.kept_with_attendance.length} santri tetap tercantum karena absensinya sudah tercatat`);
  }
  return bagian.length === 0
    ? 'Daftar santri sudah sesuai dengan penempatan kelas terbaru.'
    : `Daftar santri diperbarui: ${bagian.join(', ')}.`;
}
