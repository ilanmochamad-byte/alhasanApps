import { fetch } from 'expo/fetch';
import Constants from 'expo-constants';

import type {
  AttendancePayload,
  LoginResponse,
  MeetingDetail,
  Profile,
  ReportFilters,
  ReportMeetingDetail,
  ReportOptions,
  ReportResponse,
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

function query(values: Record<string, string | number | undefined>) {
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
  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),
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
};

export function actionableError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : 'Terjadi kesalahan. Silakan coba lagi.';
  }
  if (error.status === 401) return 'Sesi Anda berakhir. Silakan masuk kembali.';
  if (error.status === 403) return 'Anda tidak memiliki akses ke tugas ini. Muat ulang jadwal Anda.';
  if (error.status === 409) return `${error.message} Muat ulang data sebelum mencoba kembali.`;
  if (error.status === 422) return `${error.message} Periksa kembali isian Anda.`;
  return error.message;
}

export function createIdempotencyKey(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
