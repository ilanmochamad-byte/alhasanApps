import { Stack } from 'expo-router/stack';
import { IzinWaliProtection } from '@/components/izin-wali-protection';
import { useTheme } from '@/hooks/use-theme';

export default function IzinWaliLayout() {
  const theme = useTheme();
  return (
    <IzinWaliProtection>
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal', contentStyle: { backgroundColor: theme.background } }}>
      <Stack.Screen name="index" options={{ title: 'Izin melalui pembimbing' }} />
      <Stack.Screen name="buat" options={{ title: 'Ajukan izin anak' }} />
      <Stack.Screen name="[id]" options={{ title: 'Pengajuan izin wali' }} />
      <Stack.Screen name="perbaiki" options={{ title: 'Perbaiki pengajuan' }} />
    </Stack>
    </IzinWaliProtection>
  );
}
