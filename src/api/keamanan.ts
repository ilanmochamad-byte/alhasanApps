import { kueri } from '@/keamanan/format';
import { request } from './client';

// Penugasan Keamanan (lintas guru/pengurus Fase 4, PK-T3) — HANYA BACA.
// Kontrak `/api/v1/keamanan/*` di repo web (`App\Keamanan\KeamananApiService`,
// layanan yang sama dengan halaman web Keamanan). Server menghitung ulang
// penugasan Keamanan milik akun pada setiap permintaan; seluruh metode selain
// GET ditolak 405. Tidak ada cache disk dan tidak ada CSV; cetak PDF tetap di
// website (PK-T2).

export type AksesKeamanan = {
  pantau: boolean; terpasang: boolean; bagian: ('kehadiran' | 'izin' | 'pelanggaran' | 'konseling')[];
  cetak: 'website' | null; csv: false;
};

export type Halaman<T> = { items: T[]; total: number; page: number; per_page: number };

export type IzinItem = {
  id: number; asal: 'Wali' | 'Pengurus'; santri: { id: number; nis: string; nama: string };
  tgl_izin: string; tgl_kembali: string; status: string; status_label: string; tahap: string; hasil: string;
  diajukan_pada: string | null; kamar: string | null; kelas: string | null; pengurus: string | null;
  pembimbing: string | null; murobi: string | null;
};
export type IzinDaftar = Halaman<IzinItem> & {
  cakupan_label: string;
  ringkasan: { total: number; per_asal: Record<'Wali' | 'Pengurus', number>; per_hasil: Record<string, number> };
};
export type IzinFilter = { asal?: string; hasil?: string; basis?: 'izin' | 'diajukan'; dari?: string; sampai?: string; page?: number };

export type IzinDetail = {
  pengajuan: {
    id: number; asal: 'Wali' | 'Pengurus'; santri: { id: number; nis: string; nama: string };
    kamar: string | null; kelas: string | null; tahun_ajaran: string | null; tgl_izin: string; tgl_kembali: string;
    alasan: string; catatan_pengurus: string | null; catatan_wali: string | null; status: string; status_label: string;
    diajukan_pada: string | null; pengaju: string | null; pengurus: string | null; wali: string | null;
    pembimbing: string | null; murobi: string | null; dibatalkan_pada: string | null; alasan_pembatalan: string | null;
  };
  keputusan: { hasil: string; alasan: string | null; kapasitas: string; pemberi_keputusan?: string | null; diputus_pada: string; alasan_penggantian?: string | null } | null;
  riwayat: {
    id: number; status_sebelum: string | null; status_sesudah: string; status_sebelum_label: string | null; status_sesudah_label: string;
    pelaku_kapasitas: string | null; pelaku_nama: string | null; alasan: string | null; created_at: string;
  }[];
  koreksi: { hasil_sebelum: string; hasil_sesudah: string; alasan_koreksi: string; pelaku_nama: string | null; dikoreksi_pada: string }[];
};

export type PelanggaranItem = {
  id: number; santri_id: number; santri_nama: string; tahun: string; semester: string; waktu_kejadian: string;
  jenis: string | null; kategori: string; tingkat: string; poin: number; status: string;
};
export type PelanggaranDaftar = Halaman<PelanggaranItem> & { jumlah_status: Record<string, number> };
export type PelanggaranDetail = {
  pelanggaran: PelanggaranItem & {
    tempat: string | null; uraian: string; saksi: string | null; pencatat: string | null; dicatat_pada: string;
    alasan_revisi: string | null; alasan_pembatalan: string | null; digantikan_oleh_id: number | null;
  };
  riwayat_revisi: { id: number; revisi_dari_id: number | null; status: string; created_at: string; alasan_revisi: string | null; alasan_pembatalan: string | null }[];
  murobi_mengetahui: { diketahui_pada: string; catatan: string | null }[];
  total_poin: number;
  ledger: { perubahan_poin: number; alasan: string; created_at: string }[];
  lampiran: { id: number; nama: string; mime: string; ukuran: number; created_at: string }[];
  konseling: { kasus_id: number; kasus_status: string; sesi: { jadwal: string | null; status: string | null }[] }[];
};

export type KasusItem = {
  id: number; santri_id: number; santri_nama: string; tahun: string; semester: string; kerahasiaan: string;
  status: string; dibuka_pada: string; jumlah_sesi: number;
};
export type KasusDaftar = Halaman<KasusItem> & { jumlah_status: Record<string, number> };
export type KasusDetail = {
  kasus: Omit<KasusItem, 'jumlah_sesi'> & { tujuan: string | null; ditutup_pada: string | null; ringkasan_penutupan: string | null; alasan_pembatalan: string | null };
  sesi: { id: number; jadwal: string; realisasi: string | null; status: string; ringkasan_internal: string | null; hasil: string | null; tindak_lanjut: string | null }[];
  tautan: { pelanggaran_id: number; kategori: string; waktu_kejadian: string; poin: number; status: string }[];
  linimasa: { jenis: string; waktu: string }[];
  riwayat_revisi: { versi_sebelum: number; kapasitas: string; alasan: string; created_at: string }[];
};

export type KehadiranBaris = {
  attendance_id: number; meeting_id: number; meeting_date: string; class_name: string; subject: string;
  teacher_name: string; subject_type: string; subject_name: string; identity_number: string | null;
  attendance_status: string; notes: string | null;
};
export type KehadiranLaporan = {
  summary: { meeting_count: number; detail_count: number; statuses: Record<string, number> };
  items: KehadiranBaris[];
  pagination: { current_page: number; per_page: number; total: number; total_pages: number };
  filters: { date_from: string; date_to: string; status: string | null };
};
export type Pertemuan = {
  id: number; date: string; status: string;
  task: { day: string; start_time: string; end_time: string; subject: string; book: string; place: string; class: { name: string }; teacher: { name: string } };
  teacher_attendance: { status: string; notes: string | null } | null;
  students: { student_id: number; nis: string; name: string; status: string | null; notes: string | null; recorded_by: string | null; izin_id: number | null }[];
  student_summary?: { participant_count: number; recorded_count: number };
};

export const keamanan = {
  akses: () => request<AksesKeamanan>('/keamanan/akses'),
  izin: (f: IzinFilter) => request<IzinDaftar>(`/keamanan/izin${kueri({ ...f })}`),
  izinDetail: (id: number) => request<IzinDetail>(`/keamanan/izin/${id}`),
  pelanggaran: (f: { status?: string; q?: string; page?: number }) => request<PelanggaranDaftar>(`/keamanan/pelanggaran${kueri({ ...f })}`),
  pelanggaranDetail: (id: number) => request<PelanggaranDetail>(`/keamanan/pelanggaran/${id}`),
  konseling: (f: { status?: string; q?: string; page?: number }) => request<KasusDaftar>(`/keamanan/konseling${kueri({ ...f })}`),
  konselingDetail: (id: number) => request<KasusDetail>(`/keamanan/konseling/${id}`),
  kehadiran: (f: { date_from?: string; date_to?: string; status?: string; page?: number }) => request<KehadiranLaporan>(`/keamanan/kehadiran${kueri({ ...f })}`),
  pertemuan: (id: number) => request<Pertemuan>(`/keamanan/kehadiran/pertemuan/${id}`),
};
