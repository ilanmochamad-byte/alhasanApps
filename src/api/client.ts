import { fetch } from 'expo/fetch';
import Constants from 'expo-constants';

import type {
  AnakListResponse,
  AttendancePayload,
  CapabilityPayload,
  CreatePengajuanResponse,
  IzinCapability,
  IzinDetailResponse,
  IzinHistoryResponse,
  IzinLaporanCetakResponse,
  IzinLaporanCsvResponse,
  IzinLaporanFilters,
  IzinLaporanOptions,
  IzinLaporanResponse,
  IzinListQuery,
  IzinListResponse,
  KeputusanResponse,
  LoginResponse,
  MeetingDetail,
  MutasiResponse,
  NotifikasiDetailResponse,
  NotifikasiListResponse,
  NotifikasiMarkAllResponse,
  NotifikasiMarkReadResponse,
  NotifikasiUnreadResponse,
  PerangkatListResponse,
  PerangkatPencabutanResponse,
  PerangkatPushToggleResponse,
  PerangkatRegistrasiResponse,
  Profile,
  ReportFilters,
  ReportMeetingDetail,
  ReportOptions,
  ReportResponse,
  RoutingResponse,
  SantriListResponse,
  ScheduleListResponse,
  ScheduleOccurrence,
  TodayResponse,
} from '@/api/types';
import { tokenStorage } from '@/auth/token-storage';

type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  error: { code: string; message: string; details?: Record<string, unknown> } | null;
};

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT';
  body?: unknown;
  authenticated?: boolean;
  retryCount?: number;
};

let unauthorizedHandler: (() => void | Promise<void>) | null = null;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function setUnauthorizedHandler(handler: (() => void | Promise<void>) | null) {
  unauthorizedHandler = handler;
}

function apiBaseUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_API_BASE_URL
    ?? Constants.expoConfig?.extra?.apiBaseUrl;
  const value = (typeof configuredUrl === 'string' ? configuredUrl : '')
    .trim()
    .replace(/\/+$/, '');
  if (!value) {
    throw new ApiError(
      'Alamat API belum dikonfigurasi. Isi EXPO_PUBLIC_API_BASE_URL lalu muat ulang aplikasi.',
      0,
      'CONFIG_ERROR',
    );
  }
  return value;
}

async function delay(milliseconds: number) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const authenticated = options.authenticated ?? true;
  const retryCount = options.retryCount ?? (method === 'GET' ? 2 : 0);

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const token = authenticated ? await tokenStorage.get() : null;
      const response = await fetch(`${apiBaseUrl()}${path}`, {
        method,
        headers: {
          Accept: 'application/json',
          ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
      if (!response.ok || !payload?.success || payload.data === null) {
        const error = new ApiError(
          payload?.error?.message ?? 'Server tidak dapat memproses permintaan.',
          response.status,
          payload?.error?.code ?? 'HTTP_ERROR',
          payload?.error?.details ?? {},
        );
        if (response.status === 401 && authenticated) {
          await tokenStorage.clear();
          await unauthorizedHandler?.();
        }
        if (response.status >= 500 && attempt < retryCount) {
          await delay(400 * 2 ** attempt);
          continue;
        }
        throw error;
      }
      return payload.data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (attempt < retryCount) {
        await delay(400 * 2 ** attempt);
        continue;
      }
      throw new ApiError(
        'Tidak dapat terhubung ke server. Periksa internet lalu coba lagi.',
        0,
        error instanceof Error && error.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new ApiError('Permintaan gagal.', 0, 'NETWORK_ERROR');
}

function query(values: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

export const api = {
  login(username: string, password: string, deviceName: string) {
    return request<LoginResponse>('/auth/login', {
      method: 'POST', authenticated: false, body: { username, password, device_name: deviceName },
    });
  },
  profile: () => request<Profile>('/profile'),
  /**
   * Logout mencabut token API dan — bila `pushToken` disertakan — registrasi
   * push perangkat ini saja. Tanpa `pushToken`, server mencabut seluruh
   * perangkat akun tersebut (PRD V2 Fase 4 §5.5).
   */
  logout: (pushToken?: string | null) =>
    request<{ message: string; perangkat_push_dicabut: number }>('/auth/logout', {
      method: 'POST',
      body: pushToken ? { push_token: pushToken } : {},
    }),
  today: () => request<TodayResponse>('/schedules/today'),
  schedules(dateFrom: string, dateTo: string, page = 1, perPage = 100) {
    return request<ScheduleListResponse>(
      `/schedules${query({ date_from: dateFrom, date_to: dateTo, page, per_page: perPage })}`,
    );
  },
  schedule(id: number, date: string) {
    return request<ScheduleOccurrence>(`/schedules/${id}${query({ date })}`);
  },
  openMeeting(scheduleId: number, date: string, idempotencyKey: string, notes = '') {
    return request<MeetingDetail>(`/schedules/${scheduleId}/meetings`, {
      method: 'POST', body: { date, notes, idempotency_key: idempotencyKey },
    });
  },
  meeting: (id: number) => request<MeetingDetail>(`/meetings/${id}`),
  saveAttendance(meetingId: number, payload: AttendancePayload) {
    return request<MeetingDetail>(`/meetings/${meetingId}/attendance`, { method: 'PUT', body: payload });
  },
  report(filters: ReportFilters, page = 1, perPage = 25) {
    return request<ReportResponse>(`/reports${query({ ...filters, page, per_page: perPage })}`);
  },
  reportOptions: () => request<ReportOptions>('/reports/filters'),
  reportMeeting: (id: number) => request<ReportMeetingDetail>(`/reports/meetings/${id}`),
  reportPrintHtml(filters: ReportFilters) {
    return request<{ html: string }>(`/reports/print${query(filters)}`);
  },

  // -------------------------------------------------------------------------
  // V2 Fase 3 — perizinan.
  //
  // Setiap mutasi WAJIB menerima `idempotencyKey` dari pemanggil dan memakai
  // kunci yang SAMA pada setiap percobaan ulang, sehingga retry jaringan atau
  // ketukan ganda tidak pernah membuat pengajuan/keputusan tambahan.
  // -------------------------------------------------------------------------
  capabilities: () => request<CapabilityPayload>('/me/capabilities'),

  izinSantri(mode: IzinCapability | undefined, q: string, page = 1, perPage = 25) {
    return request<SantriListResponse>(`/izin/santri${query({ mode, q, page, per_page: perPage })}`);
  },
  izinAnak: () => request<AnakListResponse>('/izin/anak'),
  izinList(params: IzinListQuery = {}) {
    return request<IzinListResponse>(`/izin/pengajuan${query({ ...params, per_page: params.per_page ?? 20 })}`);
  },
  izinAntrean(params: IzinListQuery = {}) {
    return request<IzinListResponse>(`/izin/antrean${query({ ...params, per_page: params.per_page ?? 20 })}`);
  },
  izinMonitorAdmin(params: IzinListQuery = {}) {
    return request<IzinListResponse>(`/izin/admin/monitor${query({ ...params, per_page: params.per_page ?? 20 })}`);
  },
  izinDetail(id: number, mode?: IzinCapability) {
    return request<IzinDetailResponse>(`/izin/pengajuan/${id}${query({ mode })}`);
  },
  izinRiwayat(id: number, mode?: IzinCapability) {
    return request<IzinHistoryResponse>(`/izin/pengajuan/${id}/riwayat${query({ mode })}`);
  },
  izinRouting(id: number) {
    return request<RoutingResponse>(`/izin/pengajuan/${id}/routing`);
  },
  izinBuat(
    payload: {
      santri_id: number;
      tgl_izin: string;
      tgl_kembali: string;
      alasan: string;
      catatan_pengurus?: string;
    },
    idempotencyKey: string,
    mode?: IzinCapability,
  ) {
    return request<CreatePengajuanResponse>(`/izin/pengajuan${query({ mode })}`, {
      method: 'POST',
      body: { ...payload, idempotency_key: idempotencyKey },
    });
  },
  izinKeputusan(
    id: number,
    payload: { hasil: 'Disetujui' | 'Ditolak'; alasan: string; alasan_penggantian?: string; version?: number },
    idempotencyKey: string,
    mode?: IzinCapability,
  ) {
    return request<KeputusanResponse>(`/izin/pengajuan/${id}/keputusan${query({ mode })}`, {
      method: 'POST',
      body: { ...payload, idempotency_key: idempotencyKey },
    });
  },
  izinPenetapanMurobi(
    id: number,
    payload: { murobi_guru_id: number; alasan: string; version?: number },
    idempotencyKey: string,
  ) {
    return request<MutasiResponse>(`/izin/pengajuan/${id}/penetapan-murobi`, {
      method: 'POST',
      body: { ...payload, idempotency_key: idempotencyKey },
    });
  },
  izinPembatalan(
    id: number,
    payload: { alasan: string; version?: number },
    idempotencyKey: string,
    mode?: IzinCapability,
  ) {
    return request<MutasiResponse>(`/izin/pengajuan/${id}/pembatalan${query({ mode })}`, {
      method: 'POST',
      body: { ...payload, idempotency_key: idempotencyKey },
    });
  },
  izinKoreksi(
    id: number,
    payload: { hasil: 'Disetujui' | 'Ditolak'; alasan: string; alasan_koreksi: string; version?: number },
    idempotencyKey: string,
  ) {
    return request<MutasiResponse>(`/izin/pengajuan/${id}/koreksi`, {
      method: 'POST',
      body: { ...payload, idempotency_key: idempotencyKey },
    });
  },

  // -------------------------------------------------------------------------
  // V2 Fase 4 — notifikasi dan perangkat push.
  //
  // Notifikasi selalu milik SATU akun: tidak ada parameter pemilik pada satu
  // pun endpoint di bawah. Penerima ditentukan server dari token bearer,
  // sehingga mengganti id pada URL hanya menghasilkan 403.
  // -------------------------------------------------------------------------
  notifikasiList(params: { status?: string; page?: number; per_page?: number } = {}) {
    return request<NotifikasiListResponse>(
      `/notifikasi${query({ ...params, per_page: params.per_page ?? 20 })}`,
    );
  },
  notifikasiBelumDibaca: () => request<NotifikasiUnreadResponse>('/notifikasi/belum-dibaca'),
  notifikasiDetail: (id: number) => request<NotifikasiDetailResponse>(`/notifikasi/${id}`),
  notifikasiTandaiDibaca(id: number) {
    return request<NotifikasiMarkReadResponse>(`/notifikasi/${id}/dibaca`, { method: 'POST', body: {} });
  },
  notifikasiTandaiSemua() {
    return request<NotifikasiMarkAllResponse>('/notifikasi/dibaca-semua', { method: 'POST', body: {} });
  },

  // -------------------------------------------------------------------------
  // V2 Fase 5 — laporan perizinan.
  //
  // Aplikasi memakai endpoint yang SAMA dengan website. Aturan cakupan TIDAK
  // diduplikasi di sini: server menghitung ulang kemampuan akun pada setiap
  // permintaan, sehingga `mode` di bawah hanya preferensi tampilan. Mengirim
  // `mode: 'admin'` dari akun orang tua tidak memberi hak apa pun — server
  // mengabaikannya dan tetap memakai cakupan orang tua.
  // -------------------------------------------------------------------------
  izinLaporan(filters: IzinLaporanFilters = {}, page = 1, perPage = 25) {
    return request<IzinLaporanResponse>(
      `/izin/laporan${query({ ...filters, page, per_page: perPage })}`,
    );
  },
  izinLaporanOptions(filters: IzinLaporanFilters = {}) {
    return request<IzinLaporanOptions>(`/izin/laporan/filters${query({ ...filters })}`);
  },
  /** HTML ramah cetak; diubah menjadi PDF oleh `expo-print` di perangkat. */
  izinLaporanCetak(filters: IzinLaporanFilters = {}) {
    return request<IzinLaporanCetakResponse>(`/izin/laporan/cetak${query({ ...filters })}`);
  },
  /**
   * CSV SELURUH hasil filter (bukan halaman yang sedang terlihat). `jumlah_baris`
   * dikirim server agar aplikasi dapat memastikan berkas yang dibagikan memang
   * memuat seluruh hasil, bukan potongan.
   */
  izinLaporanCsv(filters: IzinLaporanFilters = {}) {
    return request<IzinLaporanCsvResponse>(`/izin/laporan/csv${query({ ...filters })}`);
  },

  perangkatList: () => request<PerangkatListResponse>('/notifikasi/perangkat'),
  perangkatDaftar(payload: {
    token: string;
    platform: 'android' | 'ios' | 'web';
    device_id?: string;
    device_label?: string;
    app_version?: string;
  }) {
    return request<PerangkatRegistrasiResponse>('/notifikasi/perangkat', { method: 'POST', body: payload });
  },
  perangkatCabut(payload: { perangkat_id?: number; token?: string; semua?: boolean; alasan?: string }) {
    return request<PerangkatPencabutanResponse>('/notifikasi/perangkat/pencabutan', {
      method: 'POST',
      body: payload,
    });
  },
  perangkatSetPush(perangkatId: number, aktif: boolean) {
    return request<PerangkatPushToggleResponse>(`/notifikasi/perangkat/${perangkatId}/push`, {
      method: 'POST',
      body: { push_aktif: aktif },
    });
  },
};

export function actionableError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : 'Terjadi kesalahan. Silakan coba lagi.';
  }
  // Offline dan timeout dibedakan dari galat server agar saran tindak lanjutnya
  // tepat (PRD Fase 3 §10).
  if (error.code === 'NETWORK_ERROR') {
    return 'Perangkat sedang offline atau server tidak terjangkau. Periksa koneksi lalu coba lagi.';
  }
  if (error.code === 'TIMEOUT') return 'Permintaan melewati batas waktu. Periksa koneksi lalu coba lagi.';
  if (error.code === 'CONFIG_ERROR') return error.message;
  if (error.status === 401) return 'Sesi Anda berakhir. Silakan masuk kembali.';
  if (error.status === 403) return 'Anda tidak memiliki akses ke tugas ini. Muat ulang jadwal Anda.';
  if (error.status === 404) return `${error.message} Data mungkin sudah dihapus atau dipindahkan.`;
  if (error.status === 409) return `${error.message} Muat ulang data sebelum mencoba kembali.`;
  if (error.status === 422) return `${error.message} Periksa kembali isian Anda.`;
  return error.message;
}

/**
 * Saran tindak lanjut untuk galat perizinan, dipakai pada layar mutasi.
 *
 * 409 tidak pernah diminta ulang otomatis: pengguna harus memuat ulang versi
 * terbaru lebih dulu supaya keputusan pertama tidak tertimpa.
 */
export function shouldReloadAfter(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 409 || error.status === 403);
}

export function createIdempotencyKey(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
