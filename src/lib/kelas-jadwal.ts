/**
 * Jadwal kelas gabungan Fase 2 (aplikasi).
 *
 * Server Fase 1 menambahkan `classes` (seluruh kelas jadwal/pertemuan, kelas
 * utama lebih dahulu) dan `class` per santri (kelas asal pada pertemuan).
 * Field lama `class` tetap kelas utama. Pembantu ini hanya untuk TAMPILAN:
 * peserta, pembukaan pertemuan, dan absensi tetap diputuskan server.
 * Server lama (tanpa `classes`) tetap terbaca sebagai satu kelas.
 */

export type KelasRingkas = { id: number; name: string; level?: string; is_primary?: boolean };

type PunyaKelas = {
  class: { id: number; name: string; level?: string };
  classes?: readonly KelasRingkas[] | null;
};

/** Seluruh kelas: kelas utama lebih dahulu, tanpa ganda; selalu minimal satu. */
export function daftarKelas(item: PunyaKelas): KelasRingkas[] {
  const sumber = item.classes && item.classes.length > 0 ? item.classes : [{ ...item.class, is_primary: true }];
  const utama = sumber.filter((kelas) => kelas.is_primary === true);
  const lain = sumber.filter((kelas) => kelas.is_primary !== true);
  const hasil: KelasRingkas[] = [];
  const terlihat = new Set<number>();
  for (const kelas of [...utama, ...lain]) {
    if (terlihat.has(kelas.id)) continue;
    terlihat.add(kelas.id);
    hasil.push(kelas);
  }
  return hasil;
}

/** Nama kelas dipisah koma, sama dengan label di website. */
export function labelKelas(item: PunyaKelas): string {
  return daftarKelas(item)
    .map((kelas) => kelas.name)
    .join(', ');
}

export function kelasGabungan(item: PunyaKelas): boolean {
  return daftarKelas(item).length > 1;
}

export type KelompokPeserta<T> = { kelas: { id: number; name: string } | null; items: T[] };

/**
 * Mengelompokkan peserta per kelas asal mengikuti urutan kelas pertemuan.
 * Urutan peserta di dalam kelompok tetap urutan server. Peserta dengan kelas
 * di luar daftar ditambahkan di akhir; peserta tanpa kelas asal (server lama)
 * masuk satu kelompok tanpa judul.
 */
export function kelompokPeserta<T extends { class?: { id: number; name: string } | null }>(
  students: readonly T[],
  kelas: readonly KelasRingkas[],
): KelompokPeserta<T>[] {
  const kelompok = new Map<number | null, KelompokPeserta<T>>();
  for (const k of kelas) kelompok.set(k.id, { kelas: { id: k.id, name: k.name }, items: [] });
  for (const student of students) {
    const asal = student.class && student.class.id > 0 ? student.class : null;
    const kunci = asal ? asal.id : null;
    let grup = kelompok.get(kunci);
    if (!grup) {
      grup = { kelas: asal ? { id: asal.id, name: asal.name } : null, items: [] };
      kelompok.set(kunci, grup);
    }
    grup.items.push(student);
  }
  return [...kelompok.values()].filter((grup) => grup.items.length > 0);
}

/** Nama kelas asal santri; kosong bila server belum mengirimkannya. */
export function namaKelasAsal(
  student: { class?: { id: number; name: string } | null },
  kelas: readonly KelasRingkas[],
): string {
  if (!student.class || student.class.id < 1) return '';
  return student.class.name || kelas.find((k) => k.id === student.class!.id)?.name || '';
}
