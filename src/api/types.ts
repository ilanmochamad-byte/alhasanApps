export type AttendanceStatus = 'Hadir' | 'Terlambat' | 'Izin' | 'Sakit' | 'Alpa';

export type Profile = {
  id: number;
  name: string;
  username: string;
  guru: { id: number; nip: string | null; name: string } | null;
  roles: string[];
  /**
   * V2 Fase 3: kemampuan aktual yang dihitung server. Navigasi aplikasi HANYA
   * dibangun dari sini, tidak pernah dari `roles`. Ditandai opsional agar
   * aplikasi tetap berjalan bila server belum diperbarui.
   */
  capabilities?: CapabilityPayload;
};

export type MeetingSummary = {
  id: number;
  status: 'Draf' | 'Dibuka' | 'Selesai';
  opened_at: string | null;
  completed_at: string | null;
};

export type ScheduleOccurrence = {
  id: number;
  occurrence_date: string;
  day: string;
  start_time: string;
  end_time: string;
  subject: string;
  book: string;
  place: string;
  class: { id: number; name: string; level: string };
  teacher: { id: number; nip: string | null; name: string };
  academic_year: { id: number; year: string; semester: string };
  meeting: MeetingSummary | null;
};

export type TodayResponse = {
  date: string;
  schedules: ScheduleOccurrence[];
  next_schedule: ScheduleOccurrence | null;
};

export type Pagination = {
  current_page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

export type ScheduleListResponse = {
  items: ScheduleOccurrence[];
  pagination: Pagination;
  filters: { date_from: string; date_to: string };
};

export type StudentMeetingRow = {
  student_id: number;
  nis: string;
  name: string;
  attendance: {
    id: number;
    status: AttendanceStatus;
    notes: string | null;
    recorded_at: string;
    updated_at: string;
  } | null;
};

export type MeetingDetail = {
  id: number;
  schedule_id: number;
  date: string;
  status: 'Draf' | 'Dibuka' | 'Selesai';
  notes: string | null;
  opened_at: string | null;
  completed_at: string | null;
  task: {
    day: string;
    start_time: string;
    end_time: string;
    subject: string;
    book: string;
    place: string;
    class: { id: number; name: string; level: string };
    teacher: { id: number; nip: string | null; name: string };
    academic_year: { id: number; year: string; semester: string };
  };
  teacher_attendance: {
    id: number;
    teacher_id: number;
    status: AttendanceStatus;
    notes: string | null;
    recorded_at: string;
    updated_at: string;
  } | null;
  students: StudentMeetingRow[];
};

export type LoginResponse = {
  token: string;
  token_type: 'Bearer';
  expires_at: string;
  profile: Profile;
};

export type AttendancePayload = {
  idempotency_key: string;
  teacher: { status: AttendanceStatus; notes: string };
  students: { student_id: number; status: AttendanceStatus; notes: string }[];
  correction_reason?: string | null;
};

export type ReportFilters = {
  date_from: string;
  date_to: string;
  academic_year_id?: number;
  teacher_id?: number;
  class_id?: number;
  schedule_id?: number;
  status?: AttendanceStatus;
};

export type ReportSummary = {
  meeting_count: number;
  detail_count: number;
  teacher_attendance_count: number;
  student_attendance_count: number;
  statuses: Record<AttendanceStatus, number>;
};

export type ReportRow = {
  attendance_id: number;
  meeting_id: number;
  schedule_id: number;
  meeting_date: string;
  meeting_status: 'Draf' | 'Dibuka' | 'Selesai';
  academic_year_id: number;
  academic_year: string;
  teacher_id: number;
  teacher_name: string;
  class_id: number;
  class_name: string;
  subject: string;
  book: string;
  place: string;
  subject_type: 'Guru' | 'Santri';
  subject_id: number;
  identity_number: string;
  subject_name: string;
  attendance_status: AttendanceStatus;
  notes: string | null;
  recorder_name: string | null;
  recorded_at: string;
  updated_at: string;
};

export type ReportScheduleSummary = {
  schedule_id: number;
  teacher: { id: number; name: string };
  class: { id: number; name: string };
  subject: string;
  book: string;
  meeting_count: number;
  detail_count: number;
  statuses: Record<AttendanceStatus, number>;
};

export type ReportResponse = {
  summary: ReportSummary;
  schedules: ReportScheduleSummary[];
  items: ReportRow[];
  pagination: Pagination;
  filters: ReportFilters;
  active_filters: Record<string, string>;
};

export type ReportOptions = {
  academic_years: { id: number; year: string; semester: string }[];
  teachers: { id: number; nip: string | null; name: string }[];
  classes: { id: number; name: string; level: string }[];
  schedules: {
    id: number;
    teacher_id: number;
    class_id: number;
    academic_year_id: number;
    label: string;
  }[];
  statuses: AttendanceStatus[];
};

export type ReportMeetingDetail = {
  id: number;
  schedule_id: number;
  date: string;
  status: 'Draf' | 'Dibuka' | 'Selesai';
  notes: string | null;
  opened_at: string | null;
  completed_at: string | null;
  updated_at: string;
  created_by: string | null;
  task: MeetingDetail['task'];
  teacher_attendance: null | {
    teacher_id: number;
    nip: string | null;
    name: string;
    status: AttendanceStatus;
    notes: string | null;
    recorded_by: string | null;
    recorded_at: string;
    updated_at: string;
  };
  students: {
    student_id: number;
    nis: string;
    name: string;
    status: AttendanceStatus | null;
    notes: string | null;
    recorded_by: string | null;
    recorded_at: string | null;
    updated_at: string | null;
  }[];
  student_summary: {
    participant_count: number;
    recorded_count: number;
    statuses: Record<AttendanceStatus, number>;
  };
};

// ---------------------------------------------------------------------------
// V2 Fase 3 — perizinan multi-peran.
// Bentuk tipe mengikuti kontrak `/api/v1` (lihat docs/api-v1.md pada repo web).
// ---------------------------------------------------------------------------

export type IzinCapability = 'admin' | 'pengurus' | 'murobi' | 'orang_tua';

export type IzinStatus =
  | 'Diajukan'
  | 'Perlu Penetapan Admin'
  | 'Disetujui'
  | 'Ditolak'
  | 'Dibatalkan';

export type CapabilityMenu = {
  key: string;
  label: string;
  capability: IzinCapability | null;
};

export type CapabilityActions = {
  dapat_membuat_pengajuan: boolean;
  dapat_memutuskan: boolean;
  dapat_menetapkan_murobi: boolean;
  dapat_mengoreksi_keputusan: boolean;
  dapat_membatalkan: boolean;
  hanya_baca: boolean;
};

export type CapabilityPayload = {
  list: IzinCapability[];
  default_mode: IzinCapability | null;
  konteks: { guru_id: number | null; pengurus_id: number | null; wali_id: number | null };
  menus: CapabilityMenu[];
  aksi: CapabilityActions;
};

export type IzinScope = {
  mode: IzinCapability;
  label: string;
  pengurus_id: number | null;
  guru_id: number | null;
  wali_id: number | null;
  hanya_baca: boolean;
};

export type IzinActions = {
  putuskan_murobi: boolean;
  putuskan_admin: boolean;
  tetapkan_murobi: boolean;
  batalkan: boolean;
  koreksi: boolean;
};

export type SantriRingkas = { id: number; nis: string; nama: string };

export type SantriPilihan = SantriRingkas & {
  jenis_kelamin: string | null;
  cakupan: string | null;
  pembimbing_assignment_id: number | null;
  hubungan: string | null;
};

export type Pengajuan = {
  id: number;
  is_legacy: boolean;
  sumber_label: string;
  status: IzinStatus;
  version: number;
  santri: SantriRingkas;
  pengurus: { id: number; nama: string | null } | null;
  pengurus_label: string;
  murobi: { guru_id: number; nama: string | null } | null;
  murobi_label: string;
  tahun_ajaran: { id: number; tahun: string | null; semester: string | null } | null;
  tgl_izin: string;
  tgl_kembali: string;
  alasan: string;
  catatan_pengurus: string | null;
  routing: { kandidat: number; catatan: string | null; pada: string | null };
  keputusan_ringkas: { hasil: string; kapasitas: string | null; diputus_pada: string | null } | null;
  keputusan_label: string;
  pembatalan: { oleh: string | null; pada: string; alasan: string | null } | null;
  diajukan_pada: string | null;
  aksi: IzinActions;
};

export type Keputusan = {
  id: number;
  hasil: 'Disetujui' | 'Ditolak';
  alasan: string;
  kapasitas: 'Murobi' | 'Admin Pengganti';
  alasan_penggantian: string | null;
  pemberi_keputusan: string | null;
  diputus_pada: string;
};

export type RiwayatItem = {
  id: number;
  peristiwa: string;
  status_sebelum: string | null;
  status_sesudah: string | null;
  pelaku_nama: string | null;
  pelaku_kapasitas: string | null;
  alasan: string | null;
  waktu: string;
};

export type KoreksiItem = {
  id: number;
  hasil_sebelum: string;
  hasil_sesudah: string;
  alasan_sebelum: string;
  alasan_sesudah: string;
  status_sebelum: string;
  status_sesudah: string;
  alasan_koreksi: string;
  pelaku_nama: string | null;
  waktu: string;
};

export type IzinListResponse = {
  scope: IzinScope;
  items: Pengajuan[];
  pagination: Pagination;
  filters: {
    q: string;
    status: string;
    source: string;
    date_from: string;
    date_to: string;
    santri_id: number | null;
    antrean: boolean;
  };
  summary: { total: number; legacy: number; per_status: Record<IzinStatus, number> };
  antrean_admin?: number;
};

export type IzinDetailResponse = {
  scope: IzinScope;
  pengajuan: Pengajuan;
  keputusan: Keputusan | null;
  riwayat: RiwayatItem[];
  koreksi: KoreksiItem[];
  aksi: IzinActions;
};

export type IzinHistoryResponse = {
  pengajuan_id: number;
  status: IzinStatus;
  version: number;
  riwayat: RiwayatItem[];
  koreksi: KoreksiItem[];
};

export type SantriListResponse = {
  scope: IzinScope;
  items: SantriPilihan[];
  pagination: Pagination;
  filters: { q: string };
};

export type AnakListResponse = {
  scope: IzinScope;
  items: { santri: SantriRingkas; hubungan: string | null; wali_utama: boolean }[];
  total: number;
};

export type GuruPilihan = { guru_id: number; nama: string; nip: string | null; targets: string[] };

export type RoutingResponse = {
  pengajuan_id: number;
  status: IzinStatus;
  version: number;
  murobi_saat_ini: number | null;
  routing: { kandidat: number; catatan: string | null; pada: string | null };
  kandidat: GuruPilihan[];
  murobi_berhak: GuruPilihan[];
};

export type CreatePengajuanResponse = {
  id: number;
  status: IzinStatus;
  murobi_guru_id: number | null;
  routing_kandidat: number;
  routing_catatan: string;
  idempotent_replay: boolean;
};

export type KeputusanResponse = {
  id: number;
  keputusan_id: number;
  status: IzinStatus;
  kapasitas: 'Murobi' | 'Admin Pengganti';
  version: number;
  idempotent_replay: boolean;
};

export type MutasiResponse = {
  id: number;
  status: IzinStatus;
  version: number;
  idempotent_replay: boolean;
};

export type IzinListQuery = {
  mode?: IzinCapability;
  q?: string;
  status?: string;
  source?: string;
  date_from?: string;
  date_to?: string;
  santri_id?: number;
  page?: number;
  per_page?: number;
};

// ---------------------------------------------------------------------------
// V2 Fase 4 — notifikasi in-app, perangkat push, dan kanal.
// ---------------------------------------------------------------------------

export type NotifikasiEventType =
  | 'izin.pengajuan_dibuat'
  | 'izin.routing_perlu_admin'
  | 'izin.murobi_ditetapkan'
  | 'izin.murobi_ditetapkan_ulang'
  | 'izin.keputusan_disetujui'
  | 'izin.keputusan_ditolak'
  | 'izin.keputusan_admin_pengganti'
  | 'izin.pembatalan'
  | 'izin.koreksi'
  | 'sistem.pesan_uji';

export type Notifikasi = {
  id: number;
  event_type: NotifikasiEventType | string;
  event_label: string;
  judul: string;
  isi: string;
  pengajuan_id: number | null;
  pengajuan_status: IzinStatus | null;
  santri_nama: string | null;
  dibaca: boolean;
  dibaca_pada: string | null;
  dibuat_pada: string;
  /**
   * Penunjuk sumber daya saja. Aplikasi WAJIB tetap memanggil endpoint detail
   * izin, yang memverifikasi hak akses di server.
   */
  tautan: { tipe: string; pengajuan_id: number | null };
};

export type NotifikasiListResponse = {
  items: Notifikasi[];
  jumlah_belum_dibaca: number;
  filters: { status: 'semua' | 'belum_dibaca' | 'sudah_dibaca' };
  pagination: Pagination;
};

export type NotifikasiDetailResponse = { notifikasi: Notifikasi };

export type NotifikasiMarkReadResponse = {
  notifikasi: Notifikasi;
  jumlah_belum_dibaca: number;
};

export type NotifikasiUnreadResponse = { jumlah: number };

export type NotifikasiMarkAllResponse = { ditandai: number; jumlah_belum_dibaca: number };

/**
 * Perangkat push milik pengguna. Server TIDAK PERNAH mengembalikan token,
 * baik terbaca maupun terlindungi.
 */
export type PerangkatPush = {
  id: number;
  platform: 'android' | 'ios' | 'web';
  device_label: string | null;
  app_version: string | null;
  push_aktif: boolean;
  dicabut: boolean;
  alasan_pencabutan: string | null;
  terakhir_aktif_pada: string | null;
  terdaftar_pada: string;
};

export type PerangkatListResponse = { items: PerangkatPush[] };

export type PerangkatRegistrasiResponse = {
  perangkat_id: number;
  baru: boolean;
  platform: 'android' | 'ios' | 'web';
  push_aktif: boolean;
  pesan: string;
};

export type PerangkatPencabutanResponse = { dicabut: number; pesan: string };

export type PerangkatPushToggleResponse = {
  perangkat_id: number;
  push_aktif: boolean;
  pesan: string;
};

// ---------------------------------------------------------------------------
// V2 Fase 5 — laporan perizinan.
//
// Bentuk tipe di bawah mengikuti respons `/izin/laporan*` APA ADANYA. Aplikasi
// TIDAK menghitung ulang ringkasan, total, maupun median dari `items`: seluruh
// angka berasal dari server yang memakai satu definisi filter/repository, dan
// `items` hanya memuat satu halaman. Menghitung ulang di sini justru akan
// membuat angka aplikasi berbeda dari angka web untuk filter yang sama.
// ---------------------------------------------------------------------------

export type IzinLaporanBasisTanggal = 'izin' | 'pengajuan' | 'keputusan';

export type IzinLaporanKanal = 'InApp' | 'Push' | 'WhatsApp';

export type IzinLaporanFilters = {
  mode?: IzinCapability;
  date_from?: string;
  date_to?: string;
  basis_tanggal?: IzinLaporanBasisTanggal;
  status?: IzinStatus;
  santri_id?: number;
  pengurus_id?: number;
  murobi_guru_id?: number;
  kamar_id?: number;
  kelas_id?: number;
  tahun_ajaran_id?: number;
  durasi_min_jam?: number;
  durasi_maks_jam?: number;
  kanal?: IzinLaporanKanal;
  sumber?: 'legacy' | 'v2';
  q?: string;
};

export type IzinLaporanRingkasan = {
  total: number;
  legacy: number;
  per_status: Record<IzinStatus, number>;
};

export type IzinLaporanDurasi = {
  jumlah: number;
  median_detik: number | null;
  rata_detik: number | null;
  min_detik: number | null;
  maks_detik: number | null;
  median_label: string;
  rata_label: string;
  min_label: string;
  maks_label: string;
  median_jam: number | null;
};

export type IzinLaporanBaris = {
  id: number;
  is_legacy: boolean;
  sumber_label: string;
  nis: string;
  nama_santri: string;
  kamar_kelas_label: string;
  tgl_izin: string;
  tgl_kembali: string;
  alasan: string;
  status: IzinStatus;
  pengurus_label: string;
  murobi_label: string;
  keputusan_label: string;
  keputusan_kapasitas: string | null;
  keputusan_alasan: string | null;
  diputus_pada: string | null;
  durasi_keputusan_detik: number | null;
  durasi_label: string;
  kanal_notifikasi: string | null;
};

export type IzinLaporanResponse = {
  cakupan: { mode: IzinCapability; label: string };
  cakupan_label: string;
  ringkasan: IzinLaporanRingkasan;
  durasi: IzinLaporanDurasi;
  items: IzinLaporanBaris[];
  pagination: Pagination;
  filter: Record<string, string | number | null>;
  filter_aktif: Record<string, string>;
  /** Sidik jari kriteria filter; sama untuk ringkasan, detail, cetak, dan CSV. */
  kriteria: string;
  query: string;
};

export type IzinLaporanOptions = {
  cakupan: { mode: IzinCapability; label: string };
  santri: { id: number; nis: string; nama: string }[];
  pengurus: { id: number; nama: string }[];
  murobi: { id: number; nama: string }[];
  tahun_ajaran: { id: number; tahun: string; semester: string; status: string }[];
  kamar: { id: number; nama: string }[];
  kelas: { id: number; nama: string; jenjang: string }[];
  status: IzinStatus[];
  kanal: IzinLaporanKanal[];
  basis_tanggal: IzinLaporanBasisTanggal[];
};

export type IzinLaporanCetakResponse = {
  html: string;
  judul: string;
  jumlah_baris: number;
  kriteria: string;
  ringkasan: IzinLaporanRingkasan;
  dibuat_pada: string;
};

export type IzinLaporanCsvResponse = {
  konten: string;
  nama_berkas: string;
  jumlah_baris: number;
  kriteria: string;
  terpotong: boolean;
  ringkasan: IzinLaporanRingkasan;
};
