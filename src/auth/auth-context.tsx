import * as Device from 'expo-device';
import { createContext, type PropsWithChildren, use, useCallback, useEffect, useState } from 'react';

import { api, setUnauthorizedHandler } from '@/api/client';
import type { CapabilityPayload, IzinCapability, Profile } from '@/api/types';
import { tokenStorage } from '@/auth/token-storage';

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

type AuthContextValue = {
  profile: Profile | null;
  capabilities: CapabilityPayload;
  hasCapability: (capability: IzinCapability) => boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(async () => {
    await tokenStorage.clear();
    setProfile(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const token = await tokenStorage.get();
        if (!token) return;
        const restoredProfile = await api.profile();
        if (active) setProfile(restoredProfile);
      } catch {
        await tokenStorage.clear();
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
    setProfile(result.profile);
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); } finally { await clearSession(); }
  }, [clearSession]);

  const capabilities = profile?.capabilities ?? NO_CAPABILITIES;
  const hasCapability = useCallback(
    (capability: IzinCapability) => capabilities.list.includes(capability),
    [capabilities],
  );

  return (
    <AuthContext.Provider value={{ profile, capabilities, hasCapability, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = use(AuthContext);
  if (!context) throw new Error('useAuth harus digunakan di dalam AuthProvider.');
  return context;
}
