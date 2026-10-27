import { request } from './client';

// PRD V7 Fase 4 — pengajuan izin orang tua melalui pembimbing. Kontrak
// `/api/v1/v7/izin` di repo web (`IzinWaliService`, sama dengan halaman web).
// Hak, tahap, versi, dan idempotensi SELALU diputuskan server per permintaan;
// `Akses`/`tindakan` hanya memilih tombol. Tidak ada cache disk: respons tinggal
// di memori layar yang memintanya. Keputusan murobi/admin pengganti dan
// penetapan murobi memakai endpoint V2 `/izin/pengajuan/{id}/…` pada ID sama.

export type PeranIzinWali = 'wali' | 'pembimbing' | 'admin' | 'murobi';
export type Tahap = 'pembimbing' | 'penetapan_pembimbing' | 'perbaikan_wali' | 'murobi' | 'penetapan_murobi' | 'selesai' | 'tidak_dikenal';

export type AksesIzinWali = {
  peran: PeranIzinWali[];
  wali: boolean; pembimbing: boolean; admin: boolean; murobi: boolean;
  tinjauan_terpasang: boolean; boleh_mengajukan: boolean;
  antrean_pembimbing: number; antrean_admin: number;
};

export type Anak = { id: number; nis: string; nama: string; hubungan: string | null };

/** Proyeksi wali: pengaju melihat isi; wali lain hanya status ringkas. */
export type PengajuanWali = {
  id: number; asal: 'Wali'; santri: { id: number; nis: string; nama: string };
  tgl_izin: string; tgl_kembali: string; status: string; status_label: string; tahap: Tahap;
  diajukan_pada: string | null; pengaju_sendiri: boolean; pengaju: string; ringkas: boolean;
  alasan?: string; catatan?: string | null; version?: number; pembimbing?: string | null; murobi?: string | null;
};

export type PengajuanPetugas = {
  id: number; asal: 'Wali'; santri: { id: number; nis: string; nama: string; aktif: boolean };
  wali: { nama: string | null; akun: string | null };
  tgl_izin: string; tgl_kembali: string; alasan: string; catatan: string | null;
  status: string; status_label: string; tahap: Tahap; version: number;
  pembimbing: { pengurus_id: number | null; nama: string | null; sah: boolean; routing_kandidat: number | null; routing_catatan: string | null; ditetapkan_pada: string | null };
  perlu_admin: boolean; murobi_guru_id: number | null;
  murobi: { nama: string | null; routing_kandidat: number | null; routing_catatan: string | null };
  keputusan_hasil: string | null; pembatalan: { alasan: string | null; waktu: string } | null;
  tahun_ajaran: string | null; diajukan_pada: string | null;
};

export type Daftar<T> = { peran: PeranIzinWali; items: T[]; total: number; page: number; per_page: number };
export type DaftarAdmin = Daftar<PengajuanPetugas> & {
  filter: { antrean: boolean; status: string | null }; ringkasan: Record<string, number> | unknown; antrean_admin: number;
};

export type Tinjauan = {
  tindakan: 'minta_perbaikan' | 'tolak' | 'teruskan' | ''; tindakan_label: string; catatan: string | null; pembimbing: string;
  peninjau?: string | null; status_sesudah?: string; versi_sebelum?: number; versi_sesudah?: number; waktu: string;
};
export type Perbaikan = {
  versi_sebelum: number; versi_sesudah: number; pengirim: string | null; waktu: string;
  sebelum: { tgl_izin: string; tgl_kembali: string; alasan: string; catatan: string | null };
  sesudah: { tgl_izin: string; tgl_kembali: string; alasan: string; catatan: string | null };
};
export type KeputusanAkhir = { hasil: string; kapasitas: string; oleh: string; alasan: string; waktu: string; dikoreksi: boolean; pemberi?: string | null };
export type RiwayatTahap = { peristiwa: string; status_sebelum?: string | null; status_sesudah: string | null; kapasitas?: string | null; pelaku?: string | null; alasan?: string | null; waktu: string };
export type JejakNotifikasi = { peristiwa: string; peristiwa_label: string; kanal: string; status: string; percobaan: number; gagal_permanen: boolean; kode_galat: string | null; penerima: string | null; dibuat: string; dikirim: string | null };
export type Penetapan = { id: number; status_sebelum: string; jumlah_kandidat: number; alasan: string; versi_sebelum: number; versi_sesudah: number; ditetapkan_pada: string; pembimbing_sebelum: string | null; pembimbing: string; penetap: string | null };

export type DetailWali = {
  peran_akses: 'wali'; pengajuan: PengajuanWali; riwayat: RiwayatTahap[];
  tinjauan?: Tinjauan[]; perbaikan?: Perbaikan[]; keputusan?: KeputusanAkhir | null;
  pembatalan?: { alasan: string | null; waktu: string } | null;
  tindakan: { perbaiki?: boolean; batalkan?: boolean };
};
export type DetailPetugas = {
  peran_akses: 'pembimbing' | 'admin' | 'murobi'; pengajuan: PengajuanPetugas;
  riwayat: RiwayatTahap[]; tinjauan: Tinjauan[]; perbaikan: Perbaikan[]; keputusan: KeputusanAkhir | null;
  penetapan?: Penetapan[];
  notifikasi?: JejakNotifikasi[];
  tindakan: {
    minta_perbaikan?: boolean; tolak?: boolean; teruskan?: boolean;
    tetapkan_pembimbing?: boolean; tetapkan_murobi?: boolean; putuskan_pengganti?: boolean; putuskan?: boolean; buka_v2?: boolean;
  };
};
export type DetailIzinWali = DetailWali | DetailPetugas;

export type KandidatPembimbing = { pengurus_id: number; nama: string; assignment_id: number; targets: string[] };
export type HasilMutasi = { id: number; status: string; tahap: Tahap; version: number; idempotent_replay: boolean; tindakan?: string };
export type TindakanTinjauan = 'minta_perbaikan' | 'tolak' | 'teruskan';
export type IsianIzin = { tgl_izin: string; tgl_kembali: string; alasan: string; catatan: string };

function q(values: Record<string, string | number | undefined>) {
  const p = new URLSearchParams();
  Object.entries(values).forEach(([k, v]) => { if (v !== undefined && v !== '' && v !== 0) p.set(k, String(v)); });
  const s = p.toString();
  return s ? `?${s}` : '';
}
const post = <T,>(path: string, body: Record<string, unknown>, key: string) =>
  request<T>(path, { method: 'POST', body: { ...body, idempotency_key: key } });

export const izinWali = {
  akses: () => request<AksesIzinWali>('/v7/izin/akses'),
  anak: () => request<{ items: Anak[] }>('/v7/izin/wali/anak'),
  daftarWali: (santriId: number, page: number) => request<Daftar<PengajuanWali>>(`/v7/izin/wali/pengajuan${q({ santri_id: santriId, page })}`),
  antreanPembimbing: (page: number) => request<Daftar<PengajuanPetugas>>(`/v7/izin/pembimbing/antrean${q({ page })}`),
  riwayatPembimbing: (page: number) => request<Daftar<PengajuanPetugas>>(`/v7/izin/pembimbing/riwayat${q({ page })}`),
  daftarAdmin: (antrean: boolean, page: number) => request<DaftarAdmin>(`/v7/izin/admin/pengajuan${q({ antrean: antrean ? 1 : undefined, page })}`),
  detail: (id: number) => request<DetailIzinWali>(`/v7/izin/pengajuan/${id}`),
  kandidat: (id: number) => request<{ items: KandidatPembimbing[] }>(`/v7/izin/pengajuan/${id}/kandidat-pembimbing`),

  buat: (isian: IsianIzin & { santri_id: number }, key: string) => post<HasilMutasi>('/v7/izin/wali/pengajuan', isian, key),
  tinjau: (id: number, tindakan: TindakanTinjauan, catatan: string, version: number, key: string) =>
    post<HasilMutasi>(`/v7/izin/pengajuan/${id}/tinjauan`, { tindakan, catatan, version }, key),
  perbaiki: (id: number, isian: IsianIzin, version: number, key: string) =>
    post<HasilMutasi>(`/v7/izin/pengajuan/${id}/perbaikan`, { ...isian, version }, key),
  batalkan: (id: number, alasan: string, version: number, key: string) =>
    post<HasilMutasi>(`/v7/izin/pengajuan/${id}/pembatalan`, { alasan, version }, key),
  tetapkanPembimbing: (id: number, pengurusId: number, alasan: string, version: number, key: string) =>
    post<HasilMutasi>(`/v7/izin/pengajuan/${id}/penetapan-pembimbing`, { pengurus_id: pengurusId, alasan, version }, key),
};
