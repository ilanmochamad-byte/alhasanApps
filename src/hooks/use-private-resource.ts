import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ApiError, actionableError } from '@/api/client';

/** Data server disembunyikan di latar. Draf formulir boleh bertahan dalam memori sampai blur/logout. */
export function usePrivateResource<T>(fetcher: () => Promise<T>, onClear?: () => void, preserveDraftOnBackground = false) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const active = useRef(false);
  const clearRef = useRef(onClear);
  useEffect(() => { clearRef.current = onClear; }, [onClear]);
  const load = useCallback(async () => {
    const epoch = ++generation.current; setData(null); setError(null);
    try { const result = await fetcher(); if (active.current && epoch === generation.current) setData(result); }
    catch (e) { if (active.current && epoch === generation.current) {
      if (e instanceof ApiError && [401, 403, 404].includes(e.status)) clearRef.current?.();
      setError(actionableError(e));
    } }
  }, [fetcher]);
  // Pergantian fetcher (mis. halaman pilihan) hanya memuat ulang data; isian
  // pengguna dibersihkan saat blur/unmount; formulir dapat mempertahankan draf di latar.
  const loadRef = useRef(load);
  const firstLoad = useRef(true);
  useEffect(() => {
    loadRef.current = load;
    if (firstLoad.current) { firstLoad.current = false; return; }
    if (active.current) void load();
  }, [load]);
  useFocusEffect(useCallback(() => {
    active.current = true; void loadRef.current();
    const clear = (discardDraft = true) => { active.current = false; generation.current++; setData(null); if (discardDraft) clearRef.current?.(); };
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') { active.current = true; void loadRef.current(); } else clear(!preserveDraftOnBackground);
    });
    return () => { clear(); sub.remove(); };
  }, [preserveDraftOnBackground]));
  return { data, error, load, active, generation };
}
