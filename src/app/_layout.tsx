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

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { profile, isLoading } = useAuth();
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
      <Stack.Protected guard={!profile}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={Boolean(profile)}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="schedule/[id]" options={{ title: 'Detail Tugas' }} />
        <Stack.Screen name="meeting/[id]" options={{ title: 'Absensi Pertemuan' }} />
        {/* Redesain tampilan: Laporan keluar dari bilah tab (4 tab) dan dibuka
            dari ubin Beranda. Rutenya tetap `/reports`. */}
        <Stack.Screen name="reports" options={{ headerShown: false }} />
        <Stack.Screen name="report/[id]" options={{ title: 'Detail Pertemuan' }} />
        {/* V2 Fase 3 — perizinan */}
        <Stack.Screen name="izin/buat" options={{ title: 'Buat Pengajuan Izin' }} />
        <Stack.Screen name="izin/[id]" options={{ title: 'Detail Pengajuan Izin' }} />
        {/* V7 Fase 4 — izin orang tua melalui pembimbing. Hak tiap layar diperiksa server. */}
        <Stack.Screen name="izin-wali" options={{ headerShown: false }} />
        {/* V2 Fase 4 — notifikasi. Redesain V2 memindahkannya dari tab ke
            tumpukan: pintu masuknya adalah lonceng di bilah judul. */}
        <Stack.Screen name="pembinaan/index" options={{ title: 'Pembinaan' }} />
        <Stack.Screen name="pembinaan/daftar" options={{ title: 'Daftar pembinaan' }} />
        <Stack.Screen name="pembinaan/buat" options={{ title: 'Catat pembinaan' }} />
        <Stack.Screen name="pembinaan/detail" options={{ title: 'Detail pembinaan' }} />
        <Stack.Screen name="rapor/index" options={{ title: 'Rapor semester' }} />
        <Stack.Screen name="rapor/nilai" options={{ title: 'Nilai mata pelajaran' }} />
        <Stack.Screen name="rapor/sikap" options={{ title: 'Sikap semester' }} />
        <Stack.Screen name="rapor/verifikasi" options={{ title: 'Verifikasi & penerbitan' }} />
        <Stack.Screen name="rapor/[id]" options={{ title: 'Rapor keluarga' }} />
        <Stack.Screen name="publikasi/[id]" options={{ title: 'Informasi pembinaan' }} />
        {/* V5 Fase 4 — kesehatan santri. Hak tiap layar diperiksa server. */}
        <Stack.Screen name="kesehatan" options={{ headerShown: false }} />
        {/* V6 Fase 4 — keuangan santri/BSA. Hak tiap layar diperiksa server. */}
        <Stack.Screen name="keuangan" options={{ headerShown: false }} />
        <Stack.Screen name="notifikasi/index" options={{ title: 'Notifikasi' }} />
        <Stack.Screen name="notifikasi/[id]" options={{ title: 'Detail Notifikasi' }} />
        <Stack.Screen name="notifikasi/perangkat" options={{ title: 'Perangkat & Push' }} />
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
          <StatusBar style="auto" />
          <RootNavigator />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
