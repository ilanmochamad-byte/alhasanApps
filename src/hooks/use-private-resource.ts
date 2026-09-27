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
  useFocusEffect(useCallback(() => {
    active.current = true; void load();
    const clear = () => { active.current = false; generation.current++; setData(null); clearRef.current?.(); };
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') { active.current = true; void load(); } else clear();
    });
    return () => { clear(); sub.remove(); };
  }, [load]));
  return { data, error, load, active, generation };
}
