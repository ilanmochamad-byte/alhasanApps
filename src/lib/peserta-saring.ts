/**
 * Pencarian santri dan tab kelas asal pada daftar peserta pertemuan.
 *
 * Pembantu ini HANYA menyaring TAMPILAN. Daftar peserta, draf absensi, dan
 * payload simpan tetap memakai seluruh `meeting.students` dari server.
 *
 * Kelompok kelas ditentukan dari ID kelas asal snapshot peserta
 * (`students[].class.id`) yang cocok dengan kelas pertemuan (`task.classes`).
 * Nama santri tidak pernah dipakai untuk menebak kelas. Peserta yang kelas
 * asalnya tidak ada atau berada di luar kelas pertemuan masuk kelompok
 * "Kelas belum tercatat".
 */

import type { KelasRingkas } from './kelas-jadwal';

export type PesertaDasar = {
  student_id: number;
  name: string;
  nis: string;
  class?: { id: number; name: string } | null;
};

export const TAB_SEMUA = 'semua';
export const TAB_TANPA_KELAS = 'tanpa-kelas';
export const LABEL_TANPA_KELAS = 'Kelas belum tercatat';

/** Huruf kecil, tanpa tanda diakritik, spasi tunggal. */
export function normalisasiCari(teks: string): string {
  return teks
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('id-ID')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Cocok bila setiap kata kunci muncul pada nama atau NIS. Kata kunci kosong
 * selalu cocok (daftar lengkap).
 */
export function cocokSantri(santri: { name: string; nis: string }, kataKunci: string): boolean {
  const kunci = normalisasiCari(kataKunci);
  if (kunci === '') return true;
  const nama = normalisasiCari(santri.name ?? '');
  const nis = normalisasiCari(String(santri.nis ?? ''));
  return kunci.split(' ').every((kata) => nama.includes(kata) || nis.includes(kata));
}

/**
 * Label pendek tab kelas. Hanya bila nama-nama kelas sama persis kecuali
 * SATU kata bagian PA/PI (atau Putra/Putri) — mis. "1 IBTIDA PA" dan
 * "1 IBTIDA PI" — tab menjadi "PA" dan "PI". Selain itu (gabungan non-IBTIDA,
 * nama berbeda lebih dari satu kata, atau bagian berulang) nama kelas
 * lengkap dipakai agar label tidak menyesatkan.
 */
const BAGIAN = /^(pa|pi|putra|putri)$/i;
export function labelPendekKelas(kelas: readonly KelasRingkas[]): Map<number, string> {
  const hasil = new Map<number, string>();
  kelas.forEach((k) => hasil.set(k.id, k.name));
  if (kelas.length < 2) return hasil;
  const kata = kelas.map((k) => k.name.trim().split(/\s+/));
  const panjang = kata[0].length;
  if (!kata.every((k) => k.length === panjang)) return hasil;
  const beda: number[] = [];
  for (let i = 0; i < panjang; i += 1) {
    if (!kata.every((k) => k[i].toLocaleLowerCase() === kata[0][i].toLocaleLowerCase())) beda.push(i);
  }
  if (beda.length !== 1) return hasil;
  const sisa = kata.map((k) => k[beda[0]]);
  const unik = new Set(sisa.map((s) => s.toLocaleLowerCase())).size === sisa.length;
  if (!unik || !sisa.every((s) => BAGIAN.test(s))) return hasil;
  kelas.forEach((k, i) => hasil.set(k.id, sisa[i]));
  return hasil;
}

/** Kunci tab kelas asal terverifikasi untuk satu peserta. */
export function kunciKelas(santri: PesertaDasar, kelas: readonly KelasRingkas[]): string {
  const id = santri.class && santri.class.id > 0 ? santri.class.id : 0;
  return id > 0 && kelas.some((k) => k.id === id) ? `kelas-${id}` : TAB_TANPA_KELAS;
}

export type TabKelas = {
  key: string;
  /** Label tab (pendek bila memungkinkan). */
  label: string;
  /** Nama lengkap untuk judul kelompok dan pembaca layar. */
  nama: string;
  count: number;
};

/**
 * Tab "Semua" + satu tab per kelas pertemuan (urutan kelas pertemuan) + tab
 * "Kelas belum tercatat" bila ada peserta tanpa kelas terverifikasi. Hitungan
 * memakai peserta unik menurut `student_id`.
 */
export function tabKelas(students: readonly PesertaDasar[], kelas: readonly KelasRingkas[]): TabKelas[] {
  const unik = pesertaUnik(students);
  const label = labelPendekKelas(kelas);
  const hitung = new Map<string, number>();
  for (const s of unik) {
    const k = kunciKelas(s, kelas);
    hitung.set(k, (hitung.get(k) ?? 0) + 1);
  }
  const tabs: TabKelas[] = [{ key: TAB_SEMUA, label: 'Semua', nama: 'Semua kelas', count: unik.length }];
  for (const k of kelas) {
    tabs.push({ key: `kelas-${k.id}`, label: label.get(k.id) ?? k.name, nama: k.name, count: hitung.get(`kelas-${k.id}`) ?? 0 });
  }
  const tanpa = hitung.get(TAB_TANPA_KELAS) ?? 0;
  if (tanpa > 0) tabs.push({ key: TAB_TANPA_KELAS, label: LABEL_TANPA_KELAS, nama: LABEL_TANPA_KELAS, count: tanpa });
  return tabs;
}

export type KelompokTampil<T> = { key: string; nama: string | null; items: T[] };

/**
 * Kelompok tampil sesudah saringan tab dan kata kunci. Pada jadwal satu kelas
 * (`kelas.length <= 1`) hasilnya satu kelompok tanpa judul seperti tampilan
 * lama. Urutan peserta di dalam kelompok tetap urutan server.
 */
export function saringPeserta<T extends PesertaDasar>(
  students: readonly T[],
  kelas: readonly KelasRingkas[],
  pilihan: { tab: string; kataKunci: string },
): KelompokTampil<T>[] {
  const cocok = students.filter((s) => cocokSantri(s, pilihan.kataKunci));
  if (kelas.length <= 1) return [{ key: TAB_SEMUA, nama: null, items: cocok }];
  const kelompok: KelompokTampil<T>[] = [
    ...kelas.map((k) => ({ key: `kelas-${k.id}`, nama: k.name, items: [] as T[] })),
    { key: TAB_TANPA_KELAS, nama: LABEL_TANPA_KELAS, items: [] as T[] },
  ];
  const indeks = new Map(kelompok.map((g, i) => [g.key, i]));
  for (const s of cocok) kelompok[indeks.get(kunciKelas(s, kelas)) ?? kelompok.length - 1].items.push(s);
  return kelompok.filter((g) => (pilihan.tab === TAB_SEMUA || g.key === pilihan.tab) && g.items.length > 0);
}

/** Nomor urut stabil menurut urutan tampil "Semua" tanpa kata kunci. */
export function nomorUrut(students: readonly PesertaDasar[], kelas: readonly KelasRingkas[]): Map<number, number> {
  const urut = saringPeserta(students, kelas, { tab: TAB_SEMUA, kataKunci: '' }).flatMap((g) => g.items);
  return new Map(urut.map((s, i) => [s.student_id, i + 1]));
}

/** Peserta unik menurut `student_id`, kemunculan pertama dipertahankan. */
export function pesertaUnik<T extends { student_id: number }>(students: readonly T[]): T[] {
  const terlihat = new Set<number>();
  return students.filter((s) => (terlihat.has(s.student_id) ? false : (terlihat.add(s.student_id), true)));
}
