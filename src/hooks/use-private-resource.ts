import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { actionableError } from '@/api/client';

/** Isi sensitif hanya dalam memori saat layar fokus. Respons lama tidak boleh kembali. */
export function usePrivateResource<T>(fetcher: () => Promise<T>, onClear?: () => void) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const active = useRef(false);
  const clearRef = useRef(onClear);
  useEffect(() => { clearRef.current = onClear; }, [onClear]);
  const load = useCallback(async () => {
    const epoch = ++generation.current; setData(null); setError(null);
    try { const result = await fetcher(); if (active.current && epoch === generation.current) setData(result); }
    catch (e) { if (active.current && epoch === generation.current) setError(actionableError(e)); }
  }, [fetcher]);
  // Pergantian fetcher (mis. halaman pilihan) hanya memuat ulang data; isian
  // pengguna dibersihkan hanya saat layar blur, aplikasi ke latar, atau unmount.
  const loadRef = useRef(load);
  const firstLoad = useRef(true);
  useEffect(() => {
    loadRef.current = load;
    if (firstLoad.current) { firstLoad.current = false; return; }
    if (active.current) void load();
  }, [load]);
  useFocusEffect(useCallback(() => {
    active.current = true; void loadRef.current();
    const clear = () => { active.current = false; generation.current++; setData(null); clearRef.current?.(); };
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') { active.current = true; void loadRef.current(); } else clear();
    });
    return () => { clear(); sub.remove(); };
  }, []));
  return { data, error, load, active, generation };
}
