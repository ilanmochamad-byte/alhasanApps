import { Stack } from 'expo-router/stack';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { ErrorState, LoadingState } from '@/components/screen-state';
import { useTheme } from '@/hooks/use-theme';

let nextKey = 0;

/**
 * Pengajuan izin orang tua melalui pembimbing (PRD V7 Fase 4). Setiap layar
 * meminta server, yang menghitung ulang hak (wali berelasi aktif, pembimbing
 * tujuan berpenugasan aktif, murobi tujuan sesudah penerusan, admin) pada
 * setiap permintaan. Menyembunyikan tombol bukan kontrol akses.
 *
 * Perlindungan native (`expo-screen-capture`, pola navigator kesehatan V5 dan
 * keuangan V6) dipasang SEBELUM layar mana pun dimuat: tangkapan/rekaman layar
 * dicegah dan cuplikan pengalih aplikasi tidak memuat nama santri atau alasan
 * izin. Binary tanpa modul gagal tertutup: tidak ada data yang dimuat.
 */
export default function IzinWaliLayout() {
  const theme = useTheme();
  const [key] = useState(() => `izin-wali-${++nextKey}`);
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
      }).catch(() => { /* Tidak ada layar izin wali yang tampil bila gagal. */ });
    };
  }, [key, attempt]);
  if (status === 'error') return <ErrorState message="Perlindungan informasi perizinan belum tersedia. Perbarui aplikasi lalu buka kembali."
    onRetry={() => { setStatus('loading'); setAttempt(v => v + 1); }} />;
  if (status !== 'ready') return <LoadingState label="Menyiapkan perlindungan informasi perizinan…" />;
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal', contentStyle: { backgroundColor: theme.background } }}>
      <Stack.Screen name="index" options={{ title: 'Izin melalui pembimbing' }} />
      <Stack.Screen name="buat" options={{ title: 'Ajukan izin anak' }} />
      <Stack.Screen name="[id]" options={{ title: 'Pengajuan izin wali' }} />
      <Stack.Screen name="perbaiki" options={{ title: 'Perbaiki pengajuan' }} />
    </Stack>
  );
}
