import * as Device from 'expo-device';
import { createContext, type PropsWithChildren, use, useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, api, setPasswordChangeHandler, setUnauthorizedHandler } from '@/api/client';
import type { CapabilityPayload, IzinCapability, Profile } from '@/api/types';
import { tokenStorage } from '@/auth/token-storage';
import { clearReportCache } from '@/rapor/pdf';
import { pushTokenStorage } from '@/notifications/push-token-storage';

/**
 * Kemampuan kosong: dipakai saat profil belum dimuat atau ketika server belum
 * mengirim `capabilities`. Aplikasi lalu tidak menampilkan menu perizinan sama
 * sekali — lebih aman daripada menebak dari nama role.
 */
const NO_CAPABILITIES: CapabilityPayload = {
  list: [],
  default_mode: null,
  konteks: { guru_id: null, pengurus_id: null, wali_id: null },
  menus: [],
  aksi: {
    dapat_membuat_pengajuan: false,
    dapat_memutuskan: false,
    dapat_menetapkan_murobi: false,
    dapat_mengoreksi_keputusan: false,
    dapat_membatalkan: false,
    hanya_baca: false,
  },
};

/** Akun yang wajib mengganti password sementara (PI-1); tanpa menu lain. */
export type WajibGantiPassword = { name: string; username: string };

type AuthContextValue = {
  profile: Profile | null;
  /** Bukan null → hanya layar Ganti Password yang tersedia sampai berhasil. */
  wajibGantiPassword: WajibGantiPassword | null;
  /** Dipanggil setelah password sementara berhasil diganti: memuat profil penuh. */
  selesaiGantiPassword: () => Promise<void>;
  capabilities: CapabilityPayload;
  hasCapability: (capability: IzinCapability) => boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wajibGantiPassword, setWajibGantiPassword] = useState<WajibGantiPassword | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const profileRef = useRef<Profile | null>(null);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  const clearSession = useCallback(async () => {
    await tokenStorage.clear();
    try { clearReportCache(); } catch { /* Cache cleanup can be retried on next startup. */ }
    setProfile(null);
    setWajibGantiPassword(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    // PF-1: admin mereset password ketika sesi masih berjalan → seluruh menu
    // ditutup dan hanya Ganti Password tersisa; token tetap dipakai.
    setPasswordChangeHandler(() => {
      const lama = profileRef.current;
      setWajibGantiPassword((kini) => kini ?? { name: lama?.name ?? '', username: lama?.username ?? '' });
      setProfile(null);
    });
    return () => { setUnauthorizedHandler(null); setPasswordChangeHandler(null); };
  }, [clearSession]);

  useEffect(() => {
    try { clearReportCache(); } catch { /* No private cache is read on failure. */ }
    let active = true;
    void (async () => {
      try {
        const token = await tokenStorage.get();
        if (!token) return;
        const restoredProfile = await api.profile();
        if (active) setProfile(restoredProfile);
      } catch (caught) {
        // Token terbatas tetap disimpan: pengguna melanjutkan Ganti Password.
        if (caught instanceof ApiError && caught.code === 'PASSWORD_CHANGE_REQUIRED') {
          if (active) setWajibGantiPassword((kini) => kini ?? { name: '', username: '' });
        } else {
          await tokenStorage.clear();
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const deviceName = Device.modelName || Device.deviceName || 'Perangkat guru';
    const result = await api.login(username, password, deviceName);
    await tokenStorage.set(result.token);
    if ('password_change_required' in result && result.password_change_required) {
      setWajibGantiPassword({ name: result.profile.name, username: result.profile.username });
      return;
    }
    setWajibGantiPassword(null);
    setProfile(result.profile as Profile);
  }, []);

  const selesaiGantiPassword = useCallback(async () => {
    const lengkap = await api.profile();
    setWajibGantiPassword(null);
    setProfile(lengkap);
  }, []);

  /**
   * Logout mencabut token API dan registrasi push PERANGKAT INI (PRD V2 Fase 4
   * §5.5). Token push disertakan agar perangkat lain milik pengguna yang sama
   * tetap menerima notifikasi. Pencabutan tidak pernah menggagalkan logout:
   * sesi lokal selalu dibersihkan.
   */
  const logout = useCallback(async () => {
    const pushToken = await pushTokenStorage.get();
    try {
      await api.logout(pushToken);
    } finally {
      await pushTokenStorage.clear();
      await clearSession();
    }
  }, [clearSession]);

  const capabilities = profile?.capabilities ?? NO_CAPABILITIES;
  const hasCapability = useCallback(
    (capability: IzinCapability) => capabilities.list.includes(capability),
    [capabilities],
  );

  return (
    <AuthContext.Provider value={{ profile, wajibGantiPassword, selesaiGantiPassword, capabilities, hasCapability, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = use(AuthContext);
  if (!context) throw new Error('useAuth harus digunakan di dalam AuthProvider.');
  return context;
}
