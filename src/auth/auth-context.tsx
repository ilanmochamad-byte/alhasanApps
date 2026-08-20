import * as Device from 'expo-device';
import { createContext, type PropsWithChildren, use, useCallback, useEffect, useState } from 'react';

import { api, setUnauthorizedHandler } from '@/api/client';
import type { Profile } from '@/api/types';
import { tokenStorage } from '@/auth/token-storage';

type AuthContextValue = {
  profile: Profile | null;
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

  return (
    <AuthContext.Provider value={{ profile, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = use(AuthContext);
  if (!context) throw new Error('useAuth harus digunakan di dalam AuthProvider.');
  return context;
}
