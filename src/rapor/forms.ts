import type { Grade } from '../api/rapor';

// Keputusan rumus, cakupan, dan versi selalu milik server. Ini hanya validasi isian.
export function gradeDraft(rows: Grade[]): Grade[] {
  const result = rows.map(row => ({ ...row, nilai: String(row.nilai), catatan: row.catatan ?? '' }));
  for (const komponen of ['Harian', 'Tengah', 'Akhir'] as const) {
    if (!result.some(row => row.komponen === komponen)) result.push({ komponen, nomor_harian: komponen === 'Harian' ? 1 : 0, nilai: '', catatan: '', version: 0 });
  }
  return result;
}
export function gradePayload(rows: Grade[], action: string) {
  const filled = rows.filter(row => row.nilai.trim() !== '' || Number(row.version) > 0);
  if (!filled.length) throw new Error('Isi sedikitnya satu nilai. Nilai kosong tetap Belum lengkap.');
  if (filled.some(row => !/^\d{1,3}(?:\.\d{1,2})?$/.test(row.nilai) || Number(row.nilai) > 100)) throw new Error('Nilai wajib 0–100 dengan maksimal dua desimal.');
  if (action === 'serahkan' && !['Harian', 'Tengah', 'Akhir'].every(kind => filled.some(row => row.komponen === kind))) throw new Error('Lengkapi harian, tengah, dan akhir sebelum menyerahkan.');
  return filled.map(({ komponen, nomor_harian, nilai, catatan, version }) => ({ komponen, nomor_harian: Number(nomor_harian), nilai, catatan, version: Number(version) }));
}
export function requireReason(reason: string, required: boolean) {
  if (reason.length > 1000 || (required && !reason.trim())) throw new Error('Alasan wajib diisi, maksimal 1000 karakter.');
}
export function notificationTarget(data: unknown): { tipe: string; id: number } | null {
  if (!data || typeof data !== 'object') return null;
  const p = data as Record<string, unknown>;
  const key = p.tipe === 'rapor' ? 'rapor_id' : p.tipe === 'v3_publikasi' ? 'publikasi_id' : p.tipe === 'izin' ? 'pengajuan_id' : null;
  if (!key || (typeof p[key] !== 'string' && typeof p[key] !== 'number')) return null;
  const id = Number(p[key]);
  return Number.isSafeInteger(id) && id > 0 ? { tipe: String(p.tipe), id } : null;
}

/** Native scheme links also retain their pointer through login; no query data is trusted. */
export function reportLinkTarget(url: string | null): number | null {
  if (!url) return null;
  try {
    const link = new URL(url);
    if (link.protocol !== 'alhasanapps:') return null;
    const path = `${link.hostname}${link.pathname}`.replace(/^\/+/, '');
    const match = /^rapor\/(\d+)\/?$/.exec(path);
    const id = match ? Number(match[1]) : 0;
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  } catch { return null; }
}
