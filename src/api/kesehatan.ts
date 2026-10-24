import { request } from './client';

// PRD V5 Fase 4 — kesehatan santri. Kontrak `/api/v1/v5/kesehatan` di repo web
// (docs/api-v1.md, docs/phase-v5-1..3). Hak SELALU dihitung server per
// permintaan; tipe `Akses` di bawah hanya dipakai untuk memilih tombol.
// Tidak ada cache disk: seluruh respons tinggal di memori layar yang memintanya.

export type Sumber = 'petugas' | 'admin' | 'admin_petugas' | 'pembimbing' | 'murobi' | 'pembimbing_murobi';
export type Akses = {
  baca: boolean;
  catat: boolean;
  sumber: Sumber | null;
  cakupan: 'seluruh' | 'binaan' | null;
  riwayat_akses: boolean;
  riwayat_versi: boolean;
  binaan: { pembimbing: boolean; murobi: boolean };
};
export type AksesWali = { wali: boolean; anak: { id: number; nama: string }[] };

export type StatusKunjungan = 'Draf' | 'Tercatat';
export type SantriRingkas = { id: number; nis: string; nama: string };
/** Santri pada pemilih petugas, dengan kelas penempatan aktif (null = belum ditempatkan). */
export type SantriPilihan = SantriRingkas & { kelas: { id: number; nama: string } | null };
export type KelasPilihan = { kelas: { id: number; nama: string; jumlah: number }[]; tanpa_kelas: number };
export type KunjunganBaris = {
  id: number;
  santri: SantriRingkas;
  waktu_kunjungan: string;
  dicatat_pada: string;
  status: StatusKunjungan;
  versi: number;
  petugas: { nama: string };
  penanda: { obat: number; rujukan: number; rujukan_menunggu: number; tindak_lanjut: number; tindak_lanjut_terbuka: number };
};
export type Penyaring = {
  q?: string; santri_id?: number; status?: '' | StatusKunjungan; dari?: string; sampai?: string;
  rujukan?: '' | 'ada' | 'menunggu' | 'diketahui' | 'tanpa'; tindak_lanjut?: '' | 'terbuka' | 'tanpa_terbuka';
};
export type DaftarKunjungan = {
  rows: KunjunganBaris[]; total: number; page: number; per_page: number; akses: Akses;
  ringkasan: Record<string, number>; filter: Required<Penyaring>;
};

export type Obat = { id: number | null; nama_obat: string; jumlah: string | null; satuan: string | null; petunjuk: string | null; waktu_pemberian: string };
export type Rujukan = { id: number | null; tujuan: string; tanggal_rujukan: string; alasan: string | null; status: 'Menunggu hasil' | 'Hasil diketahui'; hasil: string | null; tanggal_hasil: string | null };
export type TindakLanjut = { id: number | null; uraian: string; tanggal_target: string | null; status: 'Terbuka' | 'Selesai'; tanggal_selesai: string | null };
export type Kunjungan = Omit<KunjunganBaris, 'penanda'> & {
  keluhan: string; catatan_klinis: string | null; tindakan: string | null; diperbarui_pada: string;
  obat: Obat[]; rujukan: Rujukan[]; tindak_lanjut: TindakLanjut[]; akses: Akses;
};
export type Perubahan = { bagian: string; id: number | null; jenis: 'ubah' | 'tambah' | 'hapus'; kolom: string | null; sebelum: unknown; sesudah: unknown };
export type RiwayatVersi = {
  kunjungan: Omit<KunjunganBaris, 'penanda'>;
  versi: { versi: number; status: StatusKunjungan; alasan: string | null; oleh: { id: number; nama: string }; waktu: string; perubahan: Perubahan[] }[];
};
export type RiwayatAkses = {
  rows: { id: number; pengguna: { id: number; nama: string; username: string }; sumber: string; aksi: string; kanal: string; waktu: string }[];
  total: number; page: number; per_page: number;
};

/** Isian formulir yang dikirim apa adanya; validasi isi tetap milik server. */
export type IsianKunjungan = {
  waktu_kunjungan: string; keluhan: string; catatan_klinis: string; tindakan: string; status?: '' | StatusKunjungan;
  obat: { id?: number; nama_obat: string; jumlah: string; satuan: string; petunjuk: string; waktu_pemberian?: string }[];
  rujukan: { id?: number; tujuan: string; tanggal_rujukan: string; alasan: string; hasil: string; tanggal_hasil: string }[];
  tindak_lanjut: { id?: number; uraian: string; tanggal_target: string; status: 'Terbuka' | 'Selesai'; tanggal_selesai: string }[];
};

export type Proyeksi = {
  id: number; santri: { id: number; nama: string }; tanggal_kunjungan: string; diterbitkan_pada: string;
  status: 'Terbit' | 'Ditarik'; versi: number; diperbarui: boolean;
  ringkasan: string | null; tindakan_umum: string | null; tindak_lanjut_wali: string | null;
};
export type RingkasanInternal = {
  kunjungan: { id: number; versi: number; status: StatusKunjungan; tanggal: string; santri: { id: number; nama: string } };
  ringkasan: { id: number; status: 'Terbit' | 'Ditarik'; versi_berlaku: number | null; versi_terakhir: number; revisi: number } | null;
  berlaku: Proyeksi | null;
  versi: { versi: number; status: string; kunjungan_versi: number; ringkasan: string; tindakan_umum: string | null; tindak_lanjut_wali: string | null; diterbitkan_pada: string; berakhir_pada: string | null; oleh: { id: number; nama: string } }[];
  peristiwa: { jenis: 'Terbit' | 'Ganti' | 'Tarik'; versi: number; alasan: string | null; jumlah_penerima: number; kanal: string; waktu: string; oleh: { id: number; nama: string } }[];
  penerima: number | null;
  boleh_terbit: boolean;
  akses: { catat: boolean; riwayat: boolean; cakupan: string | null };
};
export type IsianRingkasan = { kunjungan_versi: number; revisi_ringkasan: number; ringkasan: string; tindakan_umum: string; tindak_lanjut_wali: string; alasan: string };
export type Pratinjau = { pratinjau: Proyeksi; pratinjau_hash: string; kunjungan_versi: number; revisi_ringkasan: number; penggantian: boolean; penerima: number };
export type HasilTerbit = { ringkasan_id: number; versi: number; revisi: number; replayed: boolean; notifikasi: { in_app: number; push: number } };

export type RingkasanWaliBaris = { id: number; santri: { id: number; nama: string }; tanggal_kunjungan: string; diterbitkan_pada: string; status: 'Terbit' | 'Ditarik'; versi: number; diperbarui: boolean; ada_tindak_lanjut: boolean };
export type DaftarWali = { rows: RingkasanWaliBaris[]; total: number; page: number; per_page: number; anak: { id: number; nama: string }[] };

export type Penugasan = {
  id: number; pengurus: { id: number; nama: string; jabatan: string | null }; tahun: { id: number; tahun: string; semester: string };
  tanggal_mulai: string; tanggal_selesai: string | null; aktif: boolean; status: string; catatan: string | null;
  alasan_pengakhiran: string | null; akun: { username: string; aktif: boolean } | null; diperbarui_pada: string;
};
export type DaftarPenugasan = {
  rows: Penugasan[]; total: number; page: number; per_page: number;
  opsi: { pengurus: { id: number; nama: string; jabatan: string | null }[]; tahun: { id: number; tahun: string; semester: string; status: string }[] };
};

function query(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== '' && value !== 0) params.set(key, String(value)); });
  const text = params.toString();
  return text ? `?${text}` : '';
}

const dasar = '/v5/kesehatan';
export const kesehatan = {
  akses: () => request<Akses>(`${dasar}/akses`),
  aksesWali: () => request<AksesWali>(`${dasar}/wali/akses`),
  /** `kelasId`: angka = satu kelas, 'tanpa' = belum ditempatkan, kosong = semua. Paling banyak 100 baris. */
  santri: (q: string, kelasId?: number | 'tanpa') => request<{ rows: SantriPilihan[]; total: number }>(`${dasar}/santri${query({ q, kelas_id: kelasId })}`),
  santriKelas: () => request<KelasPilihan>(`${dasar}/santri/kelas`),
  daftar: (filter: Penyaring, page = 1) => request<DaftarKunjungan>(`${dasar}/kunjungan${query({ ...filter, page })}`),
  detail: (id: number) => request<Kunjungan>(`${dasar}/kunjungan/${id}`),
  versi: (id: number) => request<RiwayatVersi>(`${dasar}/kunjungan/${id}/versi`),
  riwayatAkses: (id: number, page = 1) => request<RiwayatAkses>(`${dasar}/kunjungan/${id}/akses${query({ page })}`),
  buat: (santriId: number, isian: IsianKunjungan, idempotencyKey: string) =>
    request<{ id: number; replayed: boolean }>(`${dasar}/kunjungan`, { method: 'POST', body: { ...isian, santri_id: santriId, idempotency_key: idempotencyKey } }),
  koreksi: (id: number, versi: number, alasan: string, isian: IsianKunjungan, idempotencyKey: string) =>
    request<{ id: number; versi: number; replayed: boolean }>(`${dasar}/kunjungan/${id}/koreksi`, { method: 'POST', body: { ...isian, versi, alasan, idempotency_key: idempotencyKey } }),
  hasilRujukan: (id: number, rujukanId: number, body: { versi: number; alasan: string; hasil: string; tanggal_hasil: string }, idempotencyKey: string) =>
    request<{ id: number; versi: number; replayed: boolean }>(`${dasar}/kunjungan/${id}/rujukan/${rujukanId}/hasil`, { method: 'POST', body: { ...body, idempotency_key: idempotencyKey } }),
  ringkasan: (id: number) => request<RingkasanInternal>(`${dasar}/kunjungan/${id}/ringkasan`),
  pratinjau: (id: number, isian: IsianRingkasan) => request<Pratinjau>(`${dasar}/kunjungan/${id}/ringkasan/pratinjau`, { method: 'POST', body: isian }),
  terbitkan: (id: number, isian: IsianRingkasan, pratinjauHash: string, idempotencyKey: string) =>
    request<HasilTerbit>(`${dasar}/kunjungan/${id}/ringkasan`, { method: 'POST', body: { ...isian, konfirmasi: true, pratinjau_hash: pratinjauHash, idempotency_key: idempotencyKey } }),
  tarik: (id: number, revisi: number, alasan: string, idempotencyKey: string) =>
    request<{ ringkasan_id: number; versi: number; revisi: number; replayed: boolean }>(`${dasar}/kunjungan/${id}/ringkasan/tarik`, { method: 'POST', body: { revisi_ringkasan: revisi, alasan, idempotency_key: idempotencyKey } }),
  daftarWali: (santriId: number, page = 1) => request<DaftarWali>(`${dasar}/wali/ringkasan${query({ santri_id: santriId, page })}`),
  detailWali: (id: number) => request<Proyeksi>(`${dasar}/wali/ringkasan/${id}`),
  penugasan: (status: string, page = 1) => request<DaftarPenugasan>(`${dasar}/penugasan${query({ status, page })}`),
  buatPenugasan: (body: { pengurus_id: number; tahun_ajaran_id: number; tanggal_mulai: string; tanggal_selesai: string; catatan: string }) =>
    request<{ id: number; penugasan: Penugasan; hak: string | null }>(`${dasar}/penugasan`, { method: 'POST', body }),
  ubahPenugasan: (id: number, aksi: 'akhiri' | 'nonaktifkan' | 'aktifkan', body: { alasan: string; tanggal_selesai?: string }) =>
    request<{ penugasan: Penugasan }>(`${dasar}/penugasan/${id}/${aksi}`, { method: 'POST', body }),
};
