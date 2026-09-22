import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { AppState, ScrollView } from 'react-native';
import { api, actionableError } from '@/api/client';
import type { PublikasiDetail } from '@/api/types';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';

// Detail saja untuk deep-link Fase 4. Tidak ada cache disk atau menu operasional.
export default function PublikasiScreen() {
  const { profile } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PublikasiSession key={`${profile?.id}:${id}`} id={Number(id)} authenticated={Boolean(profile)} />;
}
function PublikasiSession({ id, authenticated }: { id: number; authenticated: boolean }) {
  const [data, setData] = useState<PublikasiDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const request = ++generation.current;
    setData(null); setError(null);
    if (!authenticated || !Number.isSafeInteger(id) || id < 1) { setError('Masuk dengan akun yang berhak untuk membuka informasi.'); return; }
    try {
      const result = await api.publikasiDetail(id); // Server mengecek ulang wali aktif pada setiap pembukaan.
      if (request === generation.current) setData(result);
    } catch (caught) { if (request === generation.current) setError(actionableError(caught)); }
  }, [authenticated, id]);
  useFocusEffect(useCallback(() => {
    void load();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') void load();
      else { generation.current++; setData(null); }
    });
    return () => { generation.current++; setData(null); sub.remove(); };
  }, [load]));
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState />;
  const p = data.publikasi;
  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 24, gap: 16 }}>
    <ThemedText>{p.status} · versi {p.version}</ThemedText>
    <ThemedText>Santri #{p.santri_id}</ThemedText>
    <ThemedText>Ringkasan untuk orang tua</ThemedText><ThemedText>{p.ringkasan}</ThemedText>
    <ThemedText>Tindak lanjut</ThemedText><ThemedText>{p.tindak_lanjut ?? '—'}</ThemedText>
    <ThemedText>Diterbitkan {p.diterbitkan_pada}</ThemedText>
    <ThemedText>{p.dibaca_pada ? `Dibaca ${p.dibaca_pada}` : 'Belum ditandai dibaca'}</ThemedText>
    <AppButton label="Tandai dibaca" onPress={() => {
      const request = ++generation.current;
      setData(null);
      void api.publikasiDibaca(id, p.version).then(result => { if (request === generation.current) setData(result); }).catch(caught => { if (request === generation.current) setError(actionableError(caught)); });
    }} />
    {data.riwayat.map(h => <ThemedText key={h.version}>{h.tindakan} · versi {h.version} · {h.created_at}</ThemedText>)}
  </ScrollView>;
}
