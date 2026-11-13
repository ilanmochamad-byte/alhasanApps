import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { api, actionableError } from '@/api/client';
import type { PublikasiDetail } from '@/api/types';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { GarisWaktu, HalamanStack, HalamanStackKeadaan, JudulBagianIsi, KartuIsi, KepalaRincian, TombolMuatUlangKepala } from '@/components/halaman-stack';
import { ThemedText } from '@/components/themed-text';
import { StatusPill } from '@/components/ui/status-pill';

const JUDUL = 'Informasi pembinaan';

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
  if (error) return <HalamanStackKeadaan title={JUDUL}><ErrorState message={error} onRetry={() => void load()} /></HalamanStackKeadaan>;
  if (!data) return <HalamanStackKeadaan title={JUDUL}><LoadingState /></HalamanStackKeadaan>;
  const p = data.publikasi;
  // `pengirim` dikirim server (keputusan Z redesain web) walau belum ada di tipe aplikasi; hanya ditampilkan.
  const pengirim = (p as { pengirim?: string }).pengirim;
  const tandai = () => {
    const request = ++generation.current;
    setData(null);
    void api.publikasiDibaca(id, p.version).then(result => { if (request === generation.current) setData(result); }).catch(caught => { if (request === generation.current) setError(actionableError(caught)); });
  };
  return (
    <HalamanStack title={JUDUL} actions={<TombolMuatUlangKepala onPress={() => void load()} />}
      bawah={!p.dibaca_pada ? <AppButton label="Tandai dibaca" icon="check" onPress={tandai} style={{ flex: 1 }} /> : undefined}>
      <KepalaRincian icon="mail" judul={pengirim ?? 'Pesantren Al Hasan'} keterangan={`Diterbitkan ${p.diterbitkan_pada}`}
        pills={<>
          <StatusPill label={p.status} tone={p.status === 'Terbit' ? 'success' : 'danger'} />
          <StatusPill label={p.dibaca_pada ? 'Sudah dibaca' : 'Belum dibaca'} tone={p.dibaca_pada ? 'success' : 'warning'} icon={p.dibaca_pada ? 'check' : 'clock'} />
        </>} />
      <ThemedText type="caption" themeColor="textSecondary">{p.status} · versi {p.version} · Santri #{p.santri_id}</ThemedText>
      <KartuIsi>
        <ThemedText type="h2" accessibilityRole="header">Ringkasan untuk orang tua</ThemedText>
        <ThemedText>{p.ringkasan}</ThemedText>
        <ThemedText type="bodyBold">Tindak lanjut</ThemedText>
        <ThemedText>{p.tindak_lanjut ?? '—'}</ThemedText>
      </KartuIsi>
      <ThemedText>{p.dibaca_pada ? `Dibaca ${p.dibaca_pada}` : 'Belum ditandai dibaca'}</ThemedText>
      {p.dibaca_pada ? <AppButton label="Tandai dibaca" variant="secondary" icon="check" onPress={tandai} /> : null}
      {data.riwayat.length > 0 ? (
        <>
          <JudulBagianIsi title="Riwayat" />
          <KartuIsi>
            <GarisWaktu items={data.riwayat.map(h => ({ key: h.version, judul: `${h.tindakan} · versi ${h.version}`, waktu: h.created_at }))} />
          </KartuIsi>
        </>
      ) : null}
    </HalamanStack>
  );
}
