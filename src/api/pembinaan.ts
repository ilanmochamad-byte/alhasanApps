import { request } from './client';
export type V3Caps = { capabilities: Record<string, unknown>; operasional_tersedia: boolean };
export type Student = { santri_id: number; tahun_ajaran_id: number; nama: string; tahun?: string; semester?: string };
export type Catalog = { id: number; nama: string; tingkat: string; poin_default: number };
export type V3Row = { id: number; santri_id: number; santri_nama?: string; tahun_ajaran_id: number; status: string; version: number; kategori?: string; poin?: number; kerahasiaan?: string; tujuan?: string; ringkasan_penutupan?: string };
export type Session = { id: number; version: number; status: string; jadwal: string; realisasi: string | null; ringkasan_internal?: string; hasil?: string; tindak_lanjut?: string; digantikan_oleh_id: number | null };
export type Recommendation = { id: number; santri_id: number; tahun_ajaran_id: number; nama_santri?: string; label_snapshot: string; rekomendasi_snapshot: string; total_poin_snapshot: number };
export type V3Page = { rows: V3Row[]; total: number; page: number; per_page: number };
export type CaseDetail = { kasus: V3Row; sesi: Session[]; sesi_aktif: Session[]; catatan_murobi: { id: number; catatan: string | null }[] };
export type ViolationDetail = { pelanggaran: V3Row & { uraian?: string; waktu_kejadian?: string }; total_poin: number; rekomendasi: { id: number; label: string; rekomendasi: string }[]; konseling: { kasus_id: number; sesi_id: number | null }[]; murobi: { id: number; catatan: string | null }[] };
export type Body = Record<string, unknown>;
export const pembinaan = {
  capabilities: () => request<V3Caps>('/v3/capabilities'),
  options: (page: number) => request<{ santri: Student[]; katalog: Catalog[]; dapat_mencatat: boolean }>(`/v3/mobile/options?page=${page}`),
  page: (kind: 'pelanggaran' | 'kasus', page: number) => request<V3Page>(`/v3/${kind === 'kasus' ? 'konseling/kasus' : kind}?page=${page}`),
  publications: (page: number) => request<{ rows: { id: number; status: string; ringkasan: string }[]; total: number; per_page: number }>(`/v3/publikasi?page=${page}`),
  recommendations: (page: number) => request<{ rows: Recommendation[] }>(`/v3/mobile/rekomendasi?page=${page}`),
  case: (id: number) => request<CaseDetail>(`/v3/konseling/kasus/${id}`),
  violation: (id: number) => request<ViolationDetail>(`/v3/pelanggaran/${id}`),
  mutate: <T>(path: string, body: Body) => request<T>(`/v3/${path}`, { method: 'POST', body }),
};

/** Transport tetap 25 per halaman; seluruh pilihan disatukan untuk dropdown. */
export async function pembinaanOptions() {
  const first = await pembinaan.options(1);
  const students = new Map(first.santri.map(row => [`${row.santri_id}:${row.tahun_ajaran_id}`, row]));
  const catalogs = new Map(first.katalog.map(row => [row.id, row]));
  let batch = first;
  for (let page = 2; batch.santri.length === 25 || batch.katalog.length === 25; page++) {
    batch = await pembinaan.options(page);
    if (!batch.dapat_mencatat) return { santri: [], katalog: [], dapat_mencatat: false };
    batch.santri.forEach(row => students.set(`${row.santri_id}:${row.tahun_ajaran_id}`, row));
    batch.katalog.forEach(row => catalogs.set(row.id, row));
  }
  return { ...first, santri: [...students.values()], katalog: [...catalogs.values()] };
}
