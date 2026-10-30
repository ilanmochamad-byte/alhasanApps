import { useCallback, useEffect, useState, type PropsWithChildren } from 'react';
import { AppState, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { keamanan } from '@/api/keamanan';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/chip';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { useTheme } from '@/hooks/use-theme';
import type { Nada } from '@/keamanan/format';

// Komponen bersama layar Keamanan (penugasan lintas guru/pengurus Fase 4).
// Seluruh layar HANYA MEMBACA: tidak ada formulir, tombol mutasi, atau unduhan.
// Alasan izin, uraian pelanggaran, dan isi konseling tidak dibuat `selectable`
// dan tidak pernah dicetak ke konsol/log.

/** Pintu Beranda. Server belum dipasangi Keamanan (404/503) = tidak tersedia. */
export function useKeamananAkses() {
  const fetcher = useCallback(async () => {
    try { return { akses: await keamanan.akses() }; } catch (e) {
      if (e instanceof ApiError && [404, 503].includes(e.status)) return { akses: null };
      throw e;
    }
  }, []);
  const { data, error, load } = usePrivateResource(fetcher);
  return {
    tersedia: Boolean(data?.akses?.pantau),
    status: (error ? 'gagal' : data !== null ? 'siap' : 'memuat') as 'gagal' | 'siap' | 'memuat',
    error,
    muatUlang: () => void load(),
  };
}

let nextKey = 0;

/**
 * Perlindungan native (`expo-screen-capture`, pola navigator kesehatan V5,
 * keuangan V6, dan izin wali V7) dipasang SEBELUM layar Keamanan mana pun
 * dimuat: tangkapan/rekaman layar dicegah dan cuplikan pengalih aplikasi tidak
 * memuat nama santri, alasan izin, atau catatan pembinaan. Binary tanpa modul
 * gagal tertutup: tidak ada data yang dimuat.
 */
export function KeamananProtection({ children }: PropsWithChildren) {
  const [key] = useState(() => `keamanan-${++nextKey}`);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(Platform.OS === 'web' ? 'ready' : 'loading');
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let mounted = true;
    const protection = (async () => {
      const capture = await import('expo-screen-capture');
      await capture.preventScreenCaptureAsync(key);
      if (Platform.OS === 'ios') await capture.enableAppSwitcherProtectionAsync(1);
      return capture;
    })();
    void protection.then(() => { if (mounted) setStatus('ready'); }, () => { if (mounted) setStatus('error'); });
    return () => {
      mounted = false;
      void protection.then(async capture => {
        if (Platform.OS === 'ios') await capture.disableAppSwitcherProtectionAsync();
        await capture.allowScreenCaptureAsync(key);
      }).catch(() => { /* Tidak ada layar Keamanan yang tampil bila gagal. */ });
    };
  }, [key, attempt]);
  if (status === 'error') return <ErrorState message="Perlindungan informasi Keamanan belum tersedia. Perbarui aplikasi lalu buka kembali."
    onRetry={() => { setStatus('loading'); setAttempt(v => v + 1); }} />;
  if (status !== 'ready') return <LoadingState label="Menyiapkan perlindungan informasi Keamanan…" />;
  return children;
}

/** Halaman Keamanan. Saat aplikasi tidak aktif, isi ditutup agar cuplikan OS tidak memuat data santri. */
export function Halaman({ children }: PropsWithChildren) {
  const theme = useTheme();
  const [aktif, setAktif] = useState(AppState.currentState === 'active' || AppState.currentState === undefined);
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => setAktif(state === 'active'));
    return () => sub.remove();
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.page}>
        {children}
      </ScrollView>
      {!aktif ? (
        <View style={[StyleSheet.absoluteFill, styles.cover, { backgroundColor: theme.background }]} accessibilityElementsHidden>
          <ThemedText themeColor="textSecondary">Informasi Keamanan disembunyikan.</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

export function Lencana({ label, nada }: { label: string; nada: Nada }) {
  return <Badge label={label} tone={nada} />;
}

/** Pengingat tetap di setiap layar: Keamanan hanya membaca. */
export function CatatanHanyaBaca({ text }: { text?: string }) {
  return (
    <ThemedText type="caption" themeColor="textSecondary" testID="keamanan-hanya-baca">
      {text ?? 'Hanya baca. Pencatatan, keputusan, dan koreksi dilakukan petugas yang berwenang. Cetak/PDF tersedia di website.'}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  page: { padding: 18, gap: 14, maxWidth: 800, width: '100%', alignSelf: 'center', paddingBottom: 70 },
  cover: { alignItems: 'center', justifyContent: 'center' },
});
