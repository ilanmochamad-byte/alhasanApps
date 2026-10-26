import { Stack } from 'expo-router/stack';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { ErrorState, LoadingState } from '@/components/screen-state';
import { useTheme } from '@/hooks/use-theme';

let nextKey = 0;

/**
 * Modul keuangan santri/BSA (PRD V6 Fase 4). Setiap layar meminta server,
 * yang menghitung ulang hak (petugas BSA berpenugasan aktif, admin hanya
 * membaca, orang tua hanya anak dengan relasi wali aktif) pada setiap
 * permintaan. Menyembunyikan tombol bukan kontrol akses.
 *
 * Perlindungan native (`expo-screen-capture`, pola navigator kesehatan V5)
 * dipasang SEBELUM layar keuangan mana pun dimuat: tangkapan/rekaman layar
 * dicegah dan cuplikan pengalih aplikasi tidak memuat nama, saldo, atau
 * tagihan. Binary tanpa modul gagal tertutup: tidak ada data yang dimuat.
 */
export default function KeuanganLayout() {
  const theme = useTheme();
  const [key] = useState(() => `keuangan-${++nextKey}`);
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
      }).catch(() => { /* Tidak ada layar keuangan yang tampil bila gagal. */ });
    };
  }, [key, attempt]);
  if (status === 'error') return <ErrorState message="Perlindungan informasi keuangan belum tersedia. Perbarui aplikasi lalu buka kembali."
    onRetry={() => { setStatus('loading'); setAttempt(v => v + 1); }} />;
  if (status !== 'ready') return <LoadingState label="Menyiapkan perlindungan informasi keuangan…" />;
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal', contentStyle: { backgroundColor: theme.background } }}>
      <Stack.Screen name="index" options={{ title: 'Keuangan' }} />
      <Stack.Screen name="santri/index" options={{ title: 'Santri & saldo' }} />
      <Stack.Screen name="santri/[id]" options={{ title: 'Keuangan santri' }} />
      <Stack.Screen name="transaksi" options={{ title: 'Transaksi tabungan' }} />
      <Stack.Screen name="tagihan/[id]" options={{ title: 'Rincian tagihan' }} />
      <Stack.Screen name="bayar" options={{ title: 'Catat pembayaran' }} />
      <Stack.Screen name="bayar-tabungan" options={{ title: 'Bayar dari tabungan' }} />
      <Stack.Screen name="ubah-tagihan" options={{ title: 'Revisi atau batal tagihan' }} />
      <Stack.Screen name="pembayaran/index" options={{ title: 'Pembayaran tagihan' }} />
      <Stack.Screen name="pembayaran/[id]" options={{ title: 'Kuitansi pembayaran' }} />
      <Stack.Screen name="tabungan/index" options={{ title: 'Mutasi tabungan' }} />
      <Stack.Screen name="tabungan/[id]" options={{ title: 'Kuitansi tabungan' }} />
      <Stack.Screen name="verifikasi" options={{ title: 'Verifikasi transfer' }} />
      <Stack.Screen name="tunggakan" options={{ title: 'Tunggakan' }} />
      <Stack.Screen name="rekonsiliasi" options={{ title: 'Rekonsiliasi harian' }} />
      <Stack.Screen name="penerbitan" options={{ title: 'Terbitkan tagihan' }} />
    </Stack>
  );
}
