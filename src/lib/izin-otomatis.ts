/**
 * Status "Izin" otomatis pada absensi pengajian (keputusan Human Developer
 * 23 November 2026, revisi keputusan S, IP-1…IP-6; rencana web
 * docs/izin-otomatis-pengajian/rencana.md §3.5).
 *
 * Server membekukan USULAN pada peserta (`izin`) saat pertemuan dibuka atau
 * "Perbarui daftar". Aplikasi hanya memakainya sebagai draf awal: guru tetap
 * pencatat dan boleh mengubah statusnya (IP-1). Tidak ada aturan bisnis di
 * sini yang dikirim ke server; payload absensi tetap seluruh peserta.
 * Server lama tanpa kunci `izin` → perilaku sebelumnya (draf "Hadir").
 */

export type IzinUsulan = { pengajuan_id: number; keterangan: string; sampai: string | null };

export type DrafSantri = { status: string; notes: string };

type Peserta = {
  student_id: number;
  attendance?: { status: string; notes: string | null } | null;
  izin?: IzinUsulan | null;
};

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/**
 * Draf awal satu santri: absensi tersimpan selalu menang; santri belum
 * berabsensi dengan usulan izin → "Izin" + keterangan; selain itu "Hadir".
 */
export function drafAwalSantri(s: Peserta): DrafSantri {
  if (s.attendance) return { status: s.attendance.status, notes: s.attendance.notes ?? '' };
  if (s.izin) return { status: 'Izin', notes: s.izin.keterangan };
  return { status: 'Hadir', notes: '' };
}

/**
 * Guru mengubah status. Catatan dikosongkan hanya bila masih sama persis
 * dengan keterangan izin (catatan yang sudah diedit guru dipertahankan);
 * kembali ke "Izin" dengan catatan kosong mengisi keterangan lagi.
 */
export function ubahStatusDraf(draf: DrafSantri, status: string, izin: IzinUsulan | null | undefined): DrafSantri {
  if (!izin) return { ...draf, status };
  if (status !== 'Izin' && draf.notes === izin.keterangan) return { status, notes: '' };
  if (status === 'Izin' && draf.notes.trim() === '') return { status, notes: izin.keterangan };
  return { ...draf, status };
}

/** Santri ber-usulan izin yang dilewati "Semua hadir". */
export function jumlahBerizin(peserta: Peserta[]): number {
  return peserta.filter((s) => s.izin).length;
}

/**
 * "Semua hadir" melewati santri ber-usulan izin (penafsiran implementator
 * atas IP-1, rencana §3.5). Mengembalikan draf baru dan ID yang diubah.
 */
export function tandaiSemuaHadir<T extends DrafSantri>(draf: Record<number, T>, peserta: Peserta[]): { draf: Record<number, T>; diubah: number[] } {
  const izin = new Set(peserta.filter((s) => s.izin).map((s) => s.student_id));
  const hasil: Record<number, T> = { ...draf };
  const diubah: number[] = [];
  for (const [kunci, nilai] of Object.entries(draf)) {
    const id = Number(kunci);
    if (izin.has(id)) continue;
    hasil[id] = { ...nilai, status: 'Hadir' };
    diubah.push(id);
  }
  return { draf: hasil, diubah };
}

/**
 * Draf sesudah "Perbarui daftar": santri belum berabsensi yang belum diubah
 * guru pada sesi ini mengikuti usulan izin terbaru; isian yang diubah guru
 * dan santri berabsensi dipertahankan; santri baru memakai draf awal.
 */
export function gabungDrafIzin<T extends DrafSantri>(drafLama: Record<number, T>, peserta: Peserta[], diubahManual: ReadonlySet<number>): Record<number, DrafSantri> {
  const hasil: Record<number, DrafSantri> = {};
  for (const s of peserta) {
    const lama = drafLama[s.student_id];
    hasil[s.student_id] = lama && (s.attendance || diubahManual.has(s.student_id)) ? lama : drafAwalSantri(s);
  }
  return hasil;
}

/** "25 Nov" dari tanggal ISO (YYYY-MM-DD), tanpa zona waktu. */
export function tanggalSingkat(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} ${BULAN[Number(m[2]) - 1] ?? m[2]}`;
}

/** Penanda baris santri: "Izin s.d. 25 Nov". */
export function labelIzinSampai(izin: IzinUsulan): string {
  if (izin.sampai) return `Izin s.d. ${tanggalSingkat(izin.sampai)}`;
  const m = /s\.d\. (.+)$/.exec(izin.keterangan);
  return m ? `Izin s.d. ${m[1]}` : 'Izin';
}

/** Ringkasan aditif hasil perbarui untuk usulan izin (server ≥ migrasi 036). */
export function ringkasPerubahanIzin(perubahan: { izin_suggested?: number; izin_cleared?: number } | undefined): string {
  if (!perubahan) return '';
  const bagian: string[] = [];
  if ((perubahan.izin_suggested ?? 0) > 0) bagian.push(`${perubahan.izin_suggested} usulan izin diisi`);
  if ((perubahan.izin_cleared ?? 0) > 0) bagian.push(`${perubahan.izin_cleared} usulan izin dihapus`);
  return bagian.length === 0 ? '' : `Izin: ${bagian.join(', ')}.`;
}
