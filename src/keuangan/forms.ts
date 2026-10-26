// Helper murni modul keuangan V6 (diuji `tests/keuangan.test.ts`). Aturan
// saldo, sisa, dan hak tetap milik server; di sini hanya bentuk tampilan,
// bentuk kiriman, dan penunjuk tautan.

/** 1250000 → "Rp1.250.000"; negatif diberi tanda minus. Tanpa Intl agar sama di Hermes dan web. */
export function rupiah(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  const bulat = Math.trunc(n);
  const digit = String(Math.abs(bulat)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${bulat < 0 ? '−' : ''}Rp${digit}`;
}

/**
 * Isian nominal → teks angka yang dikirim apa adanya ke server ("100.000",
 * "Rp 100.000", "100000" → "100000"). Isian lain (pecahan, huruf) dikirim
 * tanpa diubah agar server yang menolaknya dengan pesan baku (422).
 */
export function nominalKirim(isian: string): string {
  const t = isian.trim().replace(/^rp\.?\s*/i, '').replace(/\s+/g, '');
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) return t.replace(/\./g, '');
  return t;
}

/** Validasi ringan sebelum kirim (server tetap memutuskan). */
export function galatNominal(isian: string): string | null {
  const t = nominalKirim(isian);
  if (t === '') return 'Nominal wajib diisi.';
  if (!/^\d+$/.test(t) || /^0+$/.test(t)) return 'Nominal harus rupiah bulat lebih dari 0, tanpa sen.';
  return null;
}

/** Alasan koreksi/pembatalan/penolakan: wajib 5–500 karakter seperti website. */
export function galatAlasan(alasan: string): string | null {
  const n = alasan.trim().length;
  if (n < 5) return 'Alasan wajib diisi, minimal 5 karakter.';
  if (n > 500) return 'Alasan maksimal 500 karakter.';
  return null;
}

/** Sidik jari isi operasi: isi yang sama mempertahankan kunci idempotensi saat diulang. */
export function sidikJari(...bagian: unknown[]): string {
  return JSON.stringify(bagian);
}

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/** "2026-10" → "Oktober 2026". */
export function labelPeriode(periode: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(periode);
  return m ? `${BULAN[Number(m[2]) - 1] ?? m[2]} ${m[1]}` : periode;
}

/** Periode berjalan menurut tanggal perangkat (hanya nilai awal isian; server memvalidasi). */
export function periodeKini(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export type PilihanRentang = 'bulan_ini' | 'bulan_lalu' | 'tiga_bulan' | 'tahun_ini';
export const PILIHAN_RENTANG: { nilai: PilihanRentang; label: string }[] = [
  { nilai: 'bulan_ini', label: 'Bulan ini' }, { nilai: 'bulan_lalu', label: 'Bulan lalu' },
  { nilai: 'tiga_bulan', label: '3 bulan' }, { nilai: 'tahun_ini', label: 'Tahun ini' },
];

/**
 * Rentang laporan (periode TTTT-BB dari..sampai) menurut pilihan. Hanya
 * permintaan: server memvalidasi rentang (paling panjang 12 bulan, tidak di
 * masa depan) dan menghitung seluruh angka.
 */
export function rentangLaporan(pilihan: PilihanRentang, now = new Date()): { dari: string; sampai: string } {
  const bulan = (selisih: number) => periodeKini(new Date(now.getFullYear(), now.getMonth() + selisih, 1));
  switch (pilihan) {
    case 'bulan_lalu': return { dari: bulan(-1), sampai: bulan(-1) };
    case 'tiga_bulan': return { dari: bulan(-2), sampai: bulan(0) };
    case 'tahun_ini': return { dari: `${now.getFullYear()}-01`, sampai: bulan(0) };
    default: return { dari: bulan(0), sampai: bulan(0) };
  }
}

export function tanggalKini(now = new Date()): string {
  return `${periodeKini(now)}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Label jenis ledger untuk orang awam. */
export function labelJenis(jenis: string): string {
  return jenis === 'PembayaranTagihan' ? 'Bayar tagihan' : jenis === 'Pembalik' ? 'Koreksi' : jenis;
}

export function labelSumber(sumber: string | null): string {
  return sumber === 'petugas' ? 'Petugas BSA'
    : sumber === 'admin_petugas' ? 'Admin (juga Petugas BSA) — hanya membaca'
    : sumber === 'admin' ? 'Admin — hanya membaca'
    : sumber === 'wali' ? 'Orang tua/wali'
    : 'Tanpa akses';
}

/** Rute layar tujuan untuk satu penunjuk notifikasi keuangan. */
export const TIPE_KEUANGAN = { bsa_tagihan: 'tagihan_id', bsa_pembayaran: 'pembayaran_id', bsa_tabungan: 'transaksi_id' } as const;
export type TipeKeuangan = keyof typeof TIPE_KEUANGAN;

export function ruteKeuangan(tipe: TipeKeuangan) {
  return tipe === 'bsa_tagihan' ? '/keuangan/tagihan/[id]' as const
    : tipe === 'bsa_pembayaran' ? '/keuangan/pembayaran/[id]' as const
    : '/keuangan/tabungan/[id]' as const;
}

export function lokasiKeuangan(tipe: TipeKeuangan, id: number): string {
  return `/keuangan/${tipe === 'bsa_tagihan' ? 'tagihan' : tipe === 'bsa_pembayaran' ? 'pembayaran' : 'tabungan'}/${id}`;
}

/** Tautan skema `alhasanapps://keuangan/{tagihan|pembayaran|tabungan}/{id}` → penunjuk; data kueri tidak dipercaya. */
export function keuanganLinkTarget(url: string | null): { tipe: TipeKeuangan; id: number } | null {
  if (!url) return null;
  try {
    const link = new URL(url);
    if (link.protocol !== 'alhasanapps:') return null;
    const path = `${link.hostname}${link.pathname}`.replace(/^\/+/, '');
    const match = /^keuangan\/(tagihan|pembayaran|tabungan)\/(\d+)\/?$/.exec(path);
    if (!match) return null;
    const id = Number(match[2]);
    if (!Number.isSafeInteger(id) || id < 1) return null;
    return { tipe: `bsa_${match[1]}` as TipeKeuangan, id };
  } catch { return null; }
}
