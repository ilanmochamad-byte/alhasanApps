import {
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from '@/auth/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { NotificationProvider } from '@/notifications/notification-context';
import { ProfilProvider } from '@/profil/profil-context';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { profile, wajibGantiPassword, isLoading } = useAuth();
  const theme = useTheme();
  // Redesain tampilan: huruf merek dimuat sebelum navigator digambar agar teks
  // tidak berganti huruf di depan pengguna. Bila gagal (mis. berkas rusak),
  // aplikasi tetap jalan dengan huruf sistem — `ThemedText` memeriksa sendiri
  // apakah huruf sudah termuat.
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const fontsReady = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    if (!isLoading && fontsReady) void SplashScreen.hideAsync();
  }, [isLoading, fontsReady]);

  if (isLoading || !fontsReady) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}><ActivityIndicator size="large" color={theme.primary} /></View>;
  }

  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal', contentStyle: { backgroundColor: theme.background } }}>
      <Stack.Protected guard={!profile && !wajibGantiPassword}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      {/* PRD-PROFIL-IMPORT PI-1: password sementara dari admin. Sampai diganti,
          hanya layar ini yang tersedia; server juga menolak endpoint lain. */}
      <Stack.Protected guard={!profile && Boolean(wajibGantiPassword)}>
        <Stack.Screen name="ganti-password-wajib" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={Boolean(profile)}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        {/* PRD-PROFIL-IMPORT Fase 2 — data diri, foto, dan password akun sendiri. */}
        {/* Redesain gelombang 2: kedua layar menggambar kepala `stack` sendiri
            (← · judul tengah); geser-tepi iOS dan tombol kembali Android tetap. */}
        <Stack.Screen name="akun/edit-profil" options={{ title: 'Edit profil', headerShown: false }} />
        <Stack.Screen name="akun/ganti-password" options={{ title: 'Ganti password', headerShown: false }} />
        <Stack.Screen name="akun/data-diri" options={{ title: 'Data diri', headerShown: false }} />
        {/* Redesain gelombang 2 Fase 2: layar pengajian, perizinan, dan notifikasi
            menggambar kepala `stack` sendiri (← · judul · ⋯); geser-tepi iOS dan
            tombol kembali Android tetap bekerja. */}
        <Stack.Screen name="schedule/[id]" options={{ title: 'Rincian tugas', headerShown: false }} />
        <Stack.Screen name="meeting/[id]" options={{ title: 'Absensi pertemuan', headerShown: false }} />
        {/* Redesain tampilan: Laporan keluar dari bilah tab (4 tab) dan dibuka
            dari ubin Beranda. Rutenya tetap `/reports`. */}
        <Stack.Screen name="reports" options={{ headerShown: false }} />
        <Stack.Screen name="report/[id]" options={{ title: 'Rincian pertemuan', headerShown: false }} />
        {/* V2 Fase 3 — perizinan */}
        <Stack.Screen name="izin/buat" options={{ title: 'Ajukan izin', headerShown: false }} />
        <Stack.Screen name="izin/[id]" options={{ title: 'Rincian izin', headerShown: false }} />
        <Stack.Screen name="izin/laporan" options={{ title: 'Laporan perizinan', headerShown: false }} />
        {/* V7 Fase 4 — izin orang tua melalui pembimbing. Hak tiap layar diperiksa server. */}
        <Stack.Screen name="izin-wali" options={{ headerShown: false }} />
        {/* V2 Fase 4 — notifikasi. Redesain V2 memindahkannya dari tab ke
            tumpukan: pintu masuknya adalah lonceng di bilah judul. */}
        {/* Redesain gelombang 2 Fase 4: pembinaan, rapor, dan publikasi menggambar
            kepala `stack` sendiri (← · judul · ⋯); geser-tepi iOS dan tombol
            kembali Android tetap bekerja. */}
        <Stack.Screen name="pembinaan/index" options={{ title: 'Pembinaan', headerShown: false }} />
        <Stack.Screen name="pembinaan/daftar" options={{ title: 'Daftar pembinaan', headerShown: false }} />
        <Stack.Screen name="pembinaan/buat" options={{ title: 'Catat pembinaan', headerShown: false }} />
        <Stack.Screen name="pembinaan/detail" options={{ title: 'Detail pembinaan', headerShown: false }} />
        <Stack.Screen name="rapor/index" options={{ title: 'Rapor semester', headerShown: false }} />
        <Stack.Screen name="rapor/nilai" options={{ title: 'Nilai mata pelajaran', headerShown: false }} />
        <Stack.Screen name="rapor/sikap" options={{ title: 'Sikap semester', headerShown: false }} />
        <Stack.Screen name="rapor/verifikasi" options={{ title: 'Verifikasi & penerbitan', headerShown: false }} />
        <Stack.Screen name="rapor/[id]" options={{ title: 'Rapor keluarga', headerShown: false }} />
        <Stack.Screen name="publikasi/[id]" options={{ title: 'Informasi pembinaan', headerShown: false }} />
        {/* V5 Fase 4 — kesehatan santri. Hak tiap layar diperiksa server. */}
        <Stack.Screen name="kesehatan" options={{ headerShown: false }} />
        {/* V6 Fase 4 — keuangan santri/BSA. Hak tiap layar diperiksa server. */}
        <Stack.Screen name="keuangan" options={{ headerShown: false }} />
        {/* Penugasan Keamanan (lintas guru/pengurus Fase 4) — hanya baca; hak tiap layar diperiksa server. */}
        <Stack.Screen name="keamanan" options={{ headerShown: false }} />
        <Stack.Screen name="notifikasi/index" options={{ title: 'Notifikasi', headerShown: false }} />
        <Stack.Screen name="notifikasi/[id]" options={{ title: 'Rincian notifikasi', headerShown: false }} />
        <Stack.Screen name="notifikasi/perangkat" options={{ title: 'Perangkat & push', headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        {/* V2 Fase 4: penyedia notifikasi berada DI DALAM AuthProvider karena
            registrasi perangkat dan deep link bergantung pada sesi aktif. */}
        <NotificationProvider>
          <ProfilProvider>
            <StatusBar style="auto" />
            <RootNavigator />
          </ProfilProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
