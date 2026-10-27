import type { IsianIzin, Tahap, TindakanTinjauan } from '@/api/izin-wali';

// Pembantu murni modul izin wali (PRD V7 Fase 4). Validasi di sini hanya
// mencegah kiriman yang pasti ditolak; server tetap memeriksa ulang semuanya.

/** Tipe tautan notifikasi V7 (`{tipe:'izin_wali', pengajuan_id}`) dari web. */
export const TIPE_IZIN_WALI = 'izin_wali';

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

function tanggalSah(nilai: string): boolean {
  if (!POLA_TANGGAL.test(nilai)) return false;
  const [y, m, d] = nilai.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/** Aturan sama dengan `IzinWaliService::buat/perbaiki` (pesan berbahasa Indonesia). */
export function periksaIsian(isian: IsianIzin): string | null {
  if (!tanggalSah(isian.tgl_izin)) return 'Tanggal izin wajib dipilih.';
  if (!tanggalSah(isian.tgl_kembali)) return 'Tanggal kembali wajib dipilih.';
  if (isian.tgl_kembali < isian.tgl_izin) return 'Tanggal kembali tidak boleh mendahului tanggal izin.';
  const alasan = isian.alasan.trim();
  if (alasan.length < 3) return 'Alasan izin wajib diisi minimal 3 karakter.';
  if (alasan.length > 2000) return 'Alasan izin maksimal 2000 karakter.';
  if (isian.catatan.trim().length > 1000) return 'Catatan maksimal 1000 karakter.';
  return null;
}

/** Isian yang dirapikan untuk dikirim (dan sidik jari idempotensi). */
export function rapikan(isian: IsianIzin): IsianIzin {
  return { tgl_izin: isian.tgl_izin, tgl_kembali: isian.tgl_kembali, alasan: isian.alasan.trim(), catatan: isian.catatan.trim() };
}

/** Perbaikan wajib mengubah sesuatu (server menolak isi yang sama). */
export function isianBerubah(lama: IsianIzin, baru: IsianIzin): boolean {
  const a = rapikan(lama), b = rapikan(baru);
  return a.tgl_izin !== b.tgl_izin || a.tgl_kembali !== b.tgl_kembali || a.alasan !== b.alasan || a.catatan !== b.catatan;
}

/** Catatan perbaikan dan alasan penolakan wajib (≥3); catatan penerusan opsional. */
export function periksaCatatan(tindakan: TindakanTinjauan, catatan: string): string | null {
  const teks = catatan.trim();
  if (tindakan === 'teruskan') return teks.length > 1000 ? 'Catatan penerusan maksimal 1000 karakter.' : null;
  const label = tindakan === 'tolak' ? 'Alasan penolakan' : 'Catatan perbaikan untuk wali';
  if (teks.length < 3) return `${label} wajib diisi minimal 3 karakter.`;
  return teks.length > 2000 ? `${label} maksimal 2000 karakter.` : null;
}

export function periksaAlasan(alasan: string, label: string): string | null {
  const teks = alasan.trim();
  if (teks.length < 3) return `${label} wajib diisi minimal 3 karakter.`;
  return teks.length > 1000 ? `${label} maksimal 1000 karakter.` : null;
}

export type Nada = 'neutral' | 'primary' | 'warning' | 'danger';

/** Warna lencana status; penolakan pembimbing dibedakan dari keputusan murobi lewat labelnya. */
export function nadaStatus(status: string): Nada {
  if (status === 'Disetujui') return 'primary';
  if (status === 'Ditolak' || status === 'Ditolak Pembimbing') return 'danger';
  if (status === 'Dibatalkan') return 'neutral';
  return 'warning';
}

export const LABEL_TAHAP: Record<Tahap, string> = {
  pembimbing: 'Tahap pembimbing',
  penetapan_pembimbing: 'Menunggu admin (pembimbing)',
  perbaikan_wali: 'Perlu perbaikan wali',
  murobi: 'Tahap murobi',
  penetapan_murobi: 'Menunggu admin (murobi)',
  selesai: 'Selesai',
  tidak_dikenal: 'Status tidak dikenal',
};

/** Label peristiwa riwayat; sama dengan `portal_peristiwa_label` di web. */
export function labelPeristiwa(kode: string): string {
  const peta: Record<string, string> = {
    pengajuan_dibuat: 'Mengajukan izin',
    routing_otomatis: 'Diteruskan ke murobi',
    routing_perlu_admin: 'Menunggu penetapan murobi oleh admin',
    murobi_ditetapkan: 'Admin menetapkan murobi',
    murobi_ditetapkan_ulang: 'Admin mengganti murobi',
    keputusan: 'Memutuskan izin',
    pembatalan: 'Membatalkan pengajuan',
    keputusan_dikoreksi: 'Mengoreksi keputusan',
    pengajuan_wali_dibuat: 'Wali mengajukan izin',
    routing_pembimbing_otomatis: 'Diarahkan ke pembimbing',
    routing_pembimbing_perlu_admin: 'Menunggu penetapan pembimbing oleh admin',
    pembimbing_ditetapkan: 'Admin menetapkan pembimbing',
    pembimbing_ditetapkan_ulang: 'Admin mengganti pembimbing',
    tinjauan_minta_perbaikan: 'Pembimbing meminta perbaikan',
    tinjauan_ditolak_pembimbing: 'Ditolak pembimbing',
    tinjauan_diteruskan: 'Pembimbing meneruskan ke murobi',
    perbaikan_wali_dikirim: 'Wali mengirim perbaikan',
    pembatalan_wali: 'Wali membatalkan pengajuan',
  };
  const teks = peta[kode] ?? kode.replace(/_/g, ' ');
  return teks.charAt(0).toUpperCase() + teks.slice(1);
}

/** Tautan skema `alhasanapps://izin-wali/{id}` → penunjuk; data kueri tidak dipercaya. */
export function izinWaliLinkTarget(url: string | null): number | null {
  if (!url) return null;
  try {
    const link = new URL(url);
    if (link.protocol !== 'alhasanapps:') return null;
    const path = `${link.hostname}${link.pathname}`.replace(/^\/+/, '');
    const match = /^izin-wali\/(\d+)\/?$/.exec(path);
    const id = match ? Number(match[1]) : 0;
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  } catch { return null; }
}
