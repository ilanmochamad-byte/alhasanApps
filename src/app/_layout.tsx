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

  useEffect(() => {
    if (!isLoading) void SplashScreen.hideAsync();
  }, [isLoading]);

  if (isLoading) {
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
        <Stack.Screen name="report/[id]" options={{ title: 'Detail Pertemuan' }} />
        {/* V2 Fase 3 — perizinan */}
        <Stack.Screen name="izin/buat" options={{ title: 'Buat Pengajuan Izin' }} />
        <Stack.Screen name="izin/[id]" options={{ title: 'Detail Pengajuan Izin' }} />
        {/* V2 Fase 4 — notifikasi. Redesain V2 memindahkannya dari tab ke
            tumpukan: pintu masuknya adalah lonceng di bilah judul. */}
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
