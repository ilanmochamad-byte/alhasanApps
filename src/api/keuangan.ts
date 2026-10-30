import { request } from './client';

// PRD V6 Fase 4 — keuangan santri/BSA. Kontrak `/api/v1/v6/bsa` di repo web
// (docs/api-v1.md § V6 Fase 1–3). Hak, saldo, sisa, dan status SELALU
// diputuskan server per permintaan; tipe `Akses` hanya memilih tombol.
// Tidak ada cache disk: respons tinggal di memori layar yang memintanya.
// Seluruh nominal rupiah bulat (number JSON), tidak pernah dihitung ulang di aplikasi.

export type SumberAkses = 'petugas' | 'admin' | 'admin_petugas' | 'wali';
export type Akses = { baca: boolean; kelola: boolean; sumber: SumberAkses | null; jenjang: string[] | null };

export type Identitas = { id: number; nis: string; nama: string; kelas: string | null; unit: string | null; aktif: boolean };
export type SantriBaris = { id: number; nis: string; nama: string; kelas: string | null; unit: string | null; saldo: number; tagihan_terbuka: number; sisa_tagihan: number };
export type Halaman<T> = { rows: T[]; total: number; page: number; per_page: number };
export type DaftarSantri = Halaman<SantriBaris> & { akses: Akses };

export type StatusBayar = 'Lunas' | 'Sebagian' | 'Belum dibayar' | 'Dibatalkan' | string;
export type TagihanRingkas = {
  id: number; periode: string; jatuh_tempo: string; total: number; terbayar: number; sisa: number;
  status: string; status_bayar: StatusBayar; versi: number; diterbitkan_pada: string;
};

export type RujukanPembayaran = { id: number; nomor_kuitansi: string; tagihan_id: number; periode: string; status: string };
/** Baris ledger tabungan. Untuk orang tua tanpa `referensi`, `catatan`, `alasan`. */
export type TransaksiTabungan = {
  id: number; jenis: string; arah: 'Masuk' | 'Keluar'; nominal: number; saldo_sesudah: number | null; status: string; metode: string;
  tujuan: string | null; referensi?: string | null; catatan?: string | null; petugas: { nama: string }; waktu: string; nomor_kuitansi: string;
  penyetuju: { nama: string } | null; pembalik_dari: { id: number; jenis: string; nomor_kuitansi: string } | null;
  dikoreksi_oleh_id: number | null; alasan?: string | null; pembayaran: RujukanPembayaran | null;
};
export type SetoranTransfer = {
  id: number; nominal: number; referensi: string | null; catatan: string | null; status: 'Menunggu' | 'Sah' | 'Ditolak';
  transaksi_id: number | null; nomor_kuitansi: string | null; pencatat: { nama: string }; dicatat_pada: string;
  diputus: { oleh: string; pada: string } | null; alasan_tolak: string | null;
};
export type RincianSantri = {
  santri: Identitas; saldo: number; tagihan: TagihanRingkas[]; tabungan: Halaman<TransaksiTabungan>; akses: Akses;
  setoran_transfer: SetoranTransfer[]; saldo_menunggu: number;
};

export type Pembayaran = {
  id: number; tagihan_id: number; nomor_kuitansi: string; nominal: number; sumber: 'Tunai' | 'Transfer' | 'Tabungan'; status: 'Menunggu' | 'Sah' | 'Dibatalkan';
  tanggal_transaksi: string; referensi?: string | null; catatan?: string | null; pencatat: { nama: string };
  verifikasi: { oleh: string; pada: string } | null;
  kuitansi: { tagihan_versi: number; total_tagihan: number; terbayar_sebelum: number; sisa_sesudah: number } | null;
  pembatalan: { jenis?: string; alasan?: string | null; oleh?: string; pada?: string } | null;
  dicatat_pada: string; tabungan: { transaksi_id: number; nomor_kuitansi: string; pengembalian_id: number | null } | null;
};
export type RincianTagihan = TagihanRingkas & {
  santri: Identitas; unit_saat_terbit: string | null; catatan: string | null; penerbit: { nama: string };
  komponen: { urutan: number; nama: string; nominal: number }[]; akses: Akses; jumlah_komponen: number;
  penyesuaian: { versi: number; jenis: string; nama: string; nominal: number; asal: string; alasan?: string; dicatat_pada: string }[];
  pembayaran: Pembayaran[]; menunggu: number;
  riwayat: { versi: number; tindakan: string; total: number; jatuh_tempo: string; alasan: string | null; aktor: { nama: string }; waktu: string }[];
};
export type RincianPembayaran = Pembayaran & { santri: Identitas; periode: string; akses: Akses };
export type PembayaranBaris = Pembayaran & { santri: { id: number; nis: string; nama: string }; periode: string };
export type DaftarPembayaran = Halaman<PembayaranBaris> & { saring: Record<string, string | null>; akses: Akses };

export type RincianTransaksi = TransaksiTabungan & { saldo_sebelum: number; disetujui_pada: string | null; santri: Identitas; akses: Akses };
export type MutasiBaris = {
  id: number; santri: { id: number; nis: string; nama: string }; jenis: string; arah: 'Masuk' | 'Keluar'; nominal: number; saldo_sesudah: number | null;
  metode: string; tujuan: string | null; referensi: string | null; pembalik_dari_id: number | null; dikoreksi_oleh_id: number | null;
  petugas: { nama: string }; waktu: string; nomor_kuitansi: string;
};
export type DaftarMutasi = Halaman<MutasiBaris> & { saring: Record<string, string | null>; akses: Akses };
export type DaftarSetoranTransfer = Halaman<SetoranTransfer & { santri: { id: number; nis: string; nama: string } }> & { status: string; akses: Akses };

export type TunggakanBaris = {
  tagihan_id: number; santri: { id: number; nis: string; nama: string; kelas: string | null; unit: string | null };
  periode: string; jatuh_tempo: string; lewat_jatuh_tempo: boolean; total: number; terbayar: number; sisa: number; menunggu_verifikasi: number;
};
export type DaftarTunggakan = Halaman<TunggakanBaris> & {
  ringkasan: { jumlah: number; sisa: number; santri: number }; saring: { periode: string | null; unit: string | null; lewat: boolean }; unit: string[]; akses: Akses;
};

type KasCara = { setoran: number; pembayaran_tagihan: number; koreksi_masuk: number; masuk: number; penarikan_belanja: number; koreksi_keluar: number; keluar: number; bersih: number };
export type Rekonsiliasi = {
  tanggal: string; kas: { Tunai: KasCara; Transfer: KasCara }; penerimaan_kas_baru: number;
  internal: { debit_tabungan: number; pembayaran_dari_tabungan: number; selisih: number; pengembalian_ke_tabungan: number; pembatalan_pembayaran_tabungan: number; selisih_pengembalian: number };
  saldo: { awal: number; mutasi_bersih: number; akhir: number; selisih: number; akun: number; selisih_akun: number };
  tagihan: { pembayaran: Record<string, number>; pembatalan: Record<string, number>; pembayaran_total: number };
  menunggu: { setoran_transfer: { jumlah: number; nominal: number }; pembayaran_transfer: { jumlah: number; nominal: number } };
  rows: { asal: string; id: number; waktu: string; jenis: string; arah: string; cara: string; nominal: number; nomor_kuitansi: string | null; internal: boolean; santri: { id: number; nis: string; nama: string } }[];
  akses: Akses;
};

type PerCara = { Tunai: number; Transfer: number };
type JumlahNominal = { jumlah: number; nominal: number };
/** Satu baris per santri (PRD V6 Fase 5). Orang tua tanpa `selisih_saldo`/`selisih_akun`. */
export type LaporanSantri = {
  santri: Identitas; tagihan_jumlah: number; tagihan: number; terbayar: number; sisa: number; sisa_semua: number; bayar_kas: number; batal_bayar: number;
  saldo_awal: number; setoran: number; penarikan: number; belanja: number; bayar_tabungan: number; koreksi_masuk: number; koreksi_keluar: number;
  pengembalian: number; saldo_akhir: number; saldo_akun: number; selisih_saldo?: number; selisih_akun?: number;
};
/**
 * Laporan per periode (`GET /v6/bsa/laporan`). Bagian internal (kas, perpindahan
 * internal, jejak koreksi, selisih, santri nonaktif) bernilai null bagi orang tua;
 * daftar santri nonaktif hanya untuk admin.
 */
export type LaporanKeuangan = {
  rentang: { dari: string; sampai: string; tanggal_awal: string; tanggal_akhir: string; hari_ini: string; bulan: string[] };
  saring: { santri_id: number | null; unit: string | null; q: string };
  santri: Identitas | null;
  tagihan: {
    terbit: JumlahNominal; dibatalkan: JumlahNominal; terbayar: number; sisa: number; lunas: number; belum_lunas: number;
    lewat_jatuh_tempo: { jumlah: number; sisa: number }; santri: number; pembayaran_sah: PerCara & { Tabungan: number };
    pembayaran_dibatalkan: PerCara & { Tabungan: number }; menunggu_verifikasi: JumlahNominal | null;
  };
  tabungan: {
    saldo_awal: number; setoran: PerCara; penarikan: PerCara; belanja: PerCara; pembayaran_tagihan: number; koreksi_masuk: PerCara; koreksi_keluar: PerCara;
    pengembalian: number; mutasi_bersih: number; saldo_akhir: number; setoran_menunggu: JumlahNominal | null;
  };
  kas: { Tunai: KasCara; Transfer: KasCara } | null;
  penerimaan_kas_baru: number | null;
  internal: Rekonsiliasi['internal'] | null;
  pembatalan: {
    pembayaran: PerCara & { Tabungan: number }; koreksi_tabungan: { masuk: number; keluar: number; jumlah: number };
    tagihan_dibatalkan: JumlahNominal; tagihan_direvisi: number; penolakan_transfer_pembayaran: JumlahNominal | null; setoran_transfer_ditolak: JumlahNominal | null;
  };
  koreksi: { rows: { asal: string; id: number; waktu: string; jenis: string; cara: string | null; nominal: number; aktor: string | null; alasan: string | null;
    rujukan: { id: number; jenis: string; label: string }; santri: { id: number; nis: string; nama: string } }[]; terpotong: boolean } | null;
  per_bulan: { periode: string; tagihan_jumlah: number; tagihan_terbit: number; terbayar: number; sisa: number; setoran: number; penarikan_belanja: number;
    bayar_kas: number; bayar_tabungan: number; pembatalan: number; kas_baru: number }[];
  per_santri: Halaman<LaporanSantri> & { jumlah: Record<string, number> };
  nonaktif: { jumlah: number; saldo: number; sisa: number; rows: { santri: { id: number; nis: string; nama: string; aktif: boolean }; saldo: number; sisa: number }[] } | null;
  selisih: { tagihan_terbayar: number; tagihan_baris: number; saldo: number; internal: number; pengembalian: number; santri_saldo: number; santri_akun: number; nol: boolean } | null;
  akses: Akses;
};

export type PratinjauBaris = {
  santri_id: number; nis: string; nama: string; kelas: string | null; unit: string | null; hasil: 'Terbit' | 'SudahAda' | 'Dilewati';
  keterangan: string | null; tarif_id: number | null; tagihan_id: number | null; total: number; penyesuaian: { jenis: string; nama: string; nominal: number }[];
  /** Hanya pada pratinjau satu santri: komponen tarif yang akan disalin ke tagihan. */
  komponen?: { nama: string; nominal: number }[];
};
/** `santri_id` hanya ada bila pratinjau diminta untuk satu santri (server sesudah perbaikan PR #100). */
export type Pratinjau = { rows: PratinjauBaris[]; jumlah: { Terbit: number; SudahAda: number; Dilewati: number }; total_terbit: number; hash: string; periode: string; jatuh_tempo: string; unit: string | null; santri_id?: number };

// Hasil mutasi (respons ringkas; rincian dibaca ulang lewat GET).
export type HasilSetoran = { id: number; replayed: boolean; status_setoran?: 'Sah' | 'Menunggu'; transaksi_id?: number | null; setoran_transfer_id?: number | null; nomor_kuitansi?: string | null; saldo_sesudah: number };
export type HasilKeluar = { id: number; replayed: boolean; jenis?: string; transaksi_id?: number; nomor_kuitansi?: string; saldo_sesudah: number };
export type HasilPembayaran = { id: number; replayed: boolean; nomor_kuitansi: string; status_pembayaran: 'Sah' | 'Menunggu' | 'Dibatalkan'; sisa: number; transaksi_id?: number | null; saldo?: number };

export type IsianSetoran = { nominal: string; metode: 'Tunai' | 'Transfer'; referensi: string; catatan: string; terverifikasi: boolean };
export type IsianKeluar = { nominal: string; metode: 'Tunai' | 'Transfer'; jenis: 'Penarikan' | 'Belanja'; tujuan: string; referensi: string; catatan: string };
export type IsianPembayaran = { nominal: string; sumber: 'Tunai' | 'Transfer'; tanggal_transaksi: string; referensi: string; catatan: string; terverifikasi: boolean };

function query(values: Record<string, string | number | undefined | null>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') params.set(key, String(value)); });
  const text = params.toString();
  return text ? `?${text}` : '';
}

const dasar = '/v6/bsa';
/** Setiap mutasi menerima kunci idempotensi dari `useMutationGuard`; retry jaringan memakai kunci yang sama. */
const kirim = <T,>(path: string, body: Record<string, unknown>, key: string) =>
  request<T>(`${dasar}${path}`, { method: 'POST', body: { ...body, idempotency_key: key } });

export const keuangan = {
  akses: () => request<Akses>(`${dasar}/akses`),
  daftarSantri: (q: string, page = 1) => request<DaftarSantri>(`${dasar}/santri${query({ q, page })}`),
  santri: (id: number, page = 1) => request<RincianSantri>(`${dasar}/santri/${id}${query({ page })}`),
  tagihan: (id: number) => request<RincianTagihan>(`${dasar}/tagihan/${id}`),
  pembayaran: (id: number) => request<RincianPembayaran>(`${dasar}/pembayaran/${id}`),
  transaksi: (id: number) => request<RincianTransaksi>(`${dasar}/tabungan/${id}`),
  daftarPembayaran: (f: { status?: string; sumber?: string; periode?: string; q?: string }, page = 1) =>
    request<DaftarPembayaran>(`${dasar}/pembayaran${query({ ...f, page })}`),
  mutasi: (f: { jenis?: string; metode?: string; tanggal?: string; q?: string }, page = 1) => request<DaftarMutasi>(`${dasar}/tabungan${query({ ...f, page })}`),
  setoranTransfer: (status: string, q: string, page = 1) => request<DaftarSetoranTransfer>(`${dasar}/setoran-transfer${query({ status, q, page })}`),
  tunggakan: (f: { periode?: string; unit?: string; lewat?: boolean; q?: string }, page = 1) =>
    request<DaftarTunggakan>(`${dasar}/tunggakan${query({ periode: f.periode, unit: f.unit, lewat: f.lewat ? 1 : undefined, q: f.q, page })}`),
  rekonsiliasi: (tanggal: string) => request<Rekonsiliasi>(`${dasar}/rekonsiliasi${query({ tanggal })}`),
  // Fase 5: hanya laporan JSON. Ekspor CSV sengaja tidak dipanggil aplikasi (berkas
  // keuangan tidak disimpan di perangkat); ekspor tersedia di website sesuai hak.
  laporan: (f: { dari: string; sampai: string; santri?: number; q?: string }, page = 1) =>
    request<LaporanKeuangan>(`${dasar}/laporan${query({ ...f, page })}`),
  pratinjau: (b: { periode: string; jatuh_tempo: string; unit: string; santri_id?: number }) =>
    request<Pratinjau>(`${dasar}/penerbitan/pratinjau`, { method: 'POST', body: b }),

  setoran: (santriId: number, i: IsianSetoran, key: string) => kirim<HasilSetoran>(`/santri/${santriId}/setoran`, {
    nominal: i.nominal, metode: i.metode, referensi: i.referensi, catatan: i.catatan, terverifikasi: i.metode === 'Transfer' ? i.terverifikasi : undefined,
  }, key),
  keluar: (santriId: number, i: IsianKeluar, key: string) => kirim<HasilKeluar>(`/santri/${santriId}/penarikan`, { ...i }, key),
  putusSetoran: (id: number, aksi: 'verifikasi' | 'tolak', alasan: string, key: string) =>
    kirim<HasilSetoran>(`/setoran-transfer/${id}/${aksi}`, aksi === 'tolak' ? { alasan } : {}, key),
  koreksi: (transaksiId: number, alasan: string, key: string) =>
    kirim<{ id: number; replayed: boolean; saldo: number; saldo_sesudah: number; nomor_kuitansi: string }>(`/tabungan/${transaksiId}/koreksi`, { alasan }, key),
  bayar: (tagihanId: number, i: IsianPembayaran, key: string) => kirim<HasilPembayaran>(`/tagihan/${tagihanId}/pembayaran`, {
    nominal: i.nominal, sumber: i.sumber, tanggal_transaksi: i.tanggal_transaksi, referensi: i.referensi, catatan: i.catatan,
    terverifikasi: i.sumber === 'Transfer' ? i.terverifikasi : undefined,
  }, key),
  bayarTabungan: (tagihanId: number, nominal: string, catatan: string, key: string) =>
    kirim<HasilPembayaran>(`/tagihan/${tagihanId}/bayar-tabungan`, { nominal, catatan, setuju: true }, key),
  putusPembayaran: (id: number, aksi: 'verifikasi' | 'batal', alasan: string, key: string) =>
    kirim<HasilPembayaran>(`/pembayaran/${id}/${aksi}`, aksi === 'batal' ? { alasan } : {}, key),
  revisi: (tagihanId: number, b: { versi: number; jenis: string; nama: string; nominal: string; jatuh_tempo: string; alasan: string }, key: string) =>
    kirim<{ id: number; replayed: boolean; versi: number }>(`/tagihan/${tagihanId}/revisi`, b, key),
  batalTagihan: (tagihanId: number, versi: number, alasan: string, key: string) =>
    kirim<{ id: number; replayed: boolean }>(`/tagihan/${tagihanId}/batal`, { versi, alasan }, key),
  terbitkan: (b: { periode: string; jatuh_tempo: string; unit: string; pratinjau_hash: string; santri_id?: number }, key: string) =>
    kirim<{ id: number; replayed: boolean; jumlah_terbit: number }>('/penerbitan', b, key),
};
