import { Stack } from 'expo-router/stack';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { ErrorState, LoadingState } from '@/components/screen-state';
import { useTheme } from '@/hooks/use-theme';

let nextKey = 0;

/** Native protection is acquired BEFORE any health screen mounts or fetches.
 * Keep it through AppState transitions; a JS background cover alone is too late
 * for Android task snapshots. Older binaries fail closed and need rebuilding.
 */
export default function KesehatanLayout() {
  const theme = useTheme();
  const [key] = useState(() => `kesehatan-${++nextKey}`);
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
      // Wait for acquisition even if the user navigated away before it finished.
      void protection.then(async capture => {
        if (Platform.OS === 'ios') await capture.disableAppSwitcherProtectionAsync();
        await capture.allowScreenCaptureAsync(key);
      }).catch(() => { /* No private screen is rendered on failure. */ });
    };
  }, [key, attempt]);
  if (status === 'error') return <ErrorState message="Perlindungan informasi kesehatan belum tersedia. Perbarui aplikasi lalu buka kembali."
    onRetry={() => { setStatus('loading'); setAttempt(v => v + 1); }} />;
  if (status !== 'ready') return <LoadingState label="Menyiapkan perlindungan informasi kesehatan…" />;
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal', contentStyle: { backgroundColor: theme.background } }}>
      <Stack.Screen name="index" options={{ title: 'Kesehatan' }} />
      <Stack.Screen name="daftar" options={{ title: 'Kunjungan klinik' }} />
      <Stack.Screen name="catat" options={{ title: 'Catatan kunjungan' }} />
      <Stack.Screen name="kunjungan/[id]" options={{ title: 'Detail kunjungan' }} />
      <Stack.Screen name="hasil-rujukan" options={{ title: 'Hasil rujukan' }} />
      <Stack.Screen name="versi" options={{ title: 'Riwayat versi' }} />
      <Stack.Screen name="akses" options={{ title: 'Riwayat akses' }} />
      <Stack.Screen name="ringkasan" options={{ title: 'Ringkasan untuk wali' }} />
      <Stack.Screen name="penugasan" options={{ title: 'Penugasan kesehatan' }} />
      <Stack.Screen name="wali/index" options={{ title: 'Kesehatan anak' }} />
      <Stack.Screen name="wali/[id]" options={{ title: 'Informasi kesehatan' }} />
    </Stack>
  );
}
