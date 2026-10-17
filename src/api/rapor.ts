import { request } from './client';

export type Body = Record<string, unknown>;
export type Caps = { list: string[] };
export type Option = { id: number; rencana_id?: number; santri_id?: number; nama_santri?: string; nama_kelas: string; tahun: string; semester: string; mata_pelajaran?: string };
export type Student = { id: number; nama_santri: string };
export type Check = { status: string; version: number; sumber_hash: string; perlu_verifikasi_ulang: boolean };
export type Grade = { komponen: 'Harian' | 'Tengah' | 'Akhir'; nomor_harian: number; nilai: string; catatan: string; version: number; status?: string };
export type History = { id?: number; version: number; kapasitas: string; alasan: string; snapshot_json?: string; created_at?: string };
export type GradeDetail = { rencana_mapel: { id: number; mata_pelajaran: string; target_ketuntasan: string }; santri: Student[]; nilai: Grade[]; riwayat: History[]; hasil: { kelengkapan: string; nilai_tampil: number | null; predikat: string | null }; pemeriksaan: Check | null };
export type Attitude = { adab: string; kedisiplinan: string; tanggung_jawab: string; catatan: string; version: number; status: string; diketahui_murobi_user_id: number | null };
export type AttitudeDetail = { sikap: Attitude | null; riwayat: History[]; pemeriksaan: Check; murobi_aktif: number[] };
export type Material = { jenis: string; mapel_key: number; label: string; lengkap: boolean; pemeriksaan: Check; komponen?: Grade[]; hasil?: GradeDetail['hasil']; sikap?: Attitude; kehadiran?: { hitungan: Record<string, number>; jumlah_pertemuan: number; belum_dicatat: number }; penghalang?: string };
export type Matrix = { rencana: { id: number }; matriks_hash: string | null; matriks: { santri: Student; bahan: Material[]; kekurangan: string[]; siap_finalisasi: boolean; riwayat_pemeriksaan: History[] }[] };
export type Snapshot = { santri: { nama_santri: string; nis?: string }; kelas: string; tahun: string; semester: string; mapel: { nama: string; hasil: { nilai_tampil: number | null; predikat: string | null }; target: string; catatan: string }[]; rata_rata?: number | null; rata_rata_tampil?: number | null; sikap: Pick<Attitude, 'adab' | 'kedisiplinan' | 'tanggung_jawab' | 'catatan'>; kehadiran: { hitungan: Record<string, number>; jumlah_pertemuan: number; belum_dicatat: number }; catatan_umum: string; tempat: string; tanggal: string; penanda: { nama: string; gelar: string; jabatan: string }[]; kekurangan?: string[] };
export type Preview = { snapshot: Snapshot; pratinjau_hash: string; current_version: number; revision: number; status: string; rapor_id: number; siap_terbit: boolean };
export type Report = { id: number; status: string; current_version: number; versi: { version: number; status: string; diterbitkan_pada: string; snapshot?: Snapshot }[]; riwayat: { tindakan: string; version: number; created_at: string }[] };
export type ReportRow = { id: number; status: string; current_version: number; nama_santri: string; tahun: string; semester: string };
const post = <T>(path: string, body: Body) => request<T>(`/v4/${path}`, { method: 'POST', body });
export const rapor = {
  capabilities: () => request<Caps>('/v4/capabilities'),
  gradeOptions: (substitute: boolean) => request<Option[]>(`/v4/nilai/options?pengganti=${Number(substitute)}`),
  grade: (mapel: number, student: number, substitute: boolean) => request<GradeDetail>(`/v4/nilai?rencana_mapel_id=${mapel}&santri_id=${student}&pengganti=${Number(substitute)}`),
  saveGrade: (body: Body, substitute: boolean) => post<GradeDetail>(substitute ? 'nilai/pengganti' : 'nilai', body),
  attitudeOptions: (mode: string) => request<Option[]>(`/v4/sikap/options?mode=${mode}`),
  attitude: (plan: number, student: number, mode: string) => request<AttitudeDetail>(`/v4/sikap?rencana_id=${plan}&santri_id=${student}&mode=${mode}`),
  saveAttitude: (body: Body, mode: string) => post<AttitudeDetail>(mode === 'murobi' ? 'sikap/murobi' : 'sikap', body),
  reviewOptions: () => request<Option[]>('/v4/verifikasi/options'),
  review: (plan: number, student = 0) => request<Matrix>(`/v4/verifikasi?rencana_id=${plan}&santri_id=${student}`),
  verify: (body: Body) => post<Matrix>('verifikasi', body),
  preview: (plan: number, student: number, note: string) => post<Preview>('rapor/pratinjau', { rencana_id: plan, santri_id: student, catatan_umum: note }),
  publish: (body: Body) => post<{ id: number; status: string }>('rapor', body),
  list: () => request<ReportRow[]>('/v4/rapor'),
  detail: (id: number) => request<Report>(`/v4/rapor/${id}`),
};
