import { Stack } from 'expo-router/stack';
import { KeamananProtection } from '@/components/keamanan-shared';
import { useTheme } from '@/hooks/use-theme';

/** Penugasan Keamanan (lintas guru/pengurus Fase 4): seluruh layar hanya baca; hak diperiksa server per permintaan. */
export default function KeamananLayout() {
  const theme = useTheme();
  return (
    <KeamananProtection>
    {/* Redesain gelombang 2 Fase 4: setiap layar menggambar kepala `stack` sendiri. */}
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
      <Stack.Screen name="index" options={{ title: 'Keamanan' }} />
      <Stack.Screen name="kehadiran/index" options={{ title: 'Kehadiran pengajian' }} />
      <Stack.Screen name="kehadiran/[id]" options={{ title: 'Rincian pertemuan' }} />
      <Stack.Screen name="izin/index" options={{ title: 'Perizinan santri' }} />
      <Stack.Screen name="izin/[id]" options={{ title: 'Rincian izin' }} />
      <Stack.Screen name="pelanggaran/index" options={{ title: 'Pelanggaran' }} />
      <Stack.Screen name="pelanggaran/[id]" options={{ title: 'Rincian pelanggaran' }} />
      <Stack.Screen name="konseling/index" options={{ title: 'Konseling' }} />
      <Stack.Screen name="konseling/[id]" options={{ title: 'Rincian kasus' }} />
    </Stack>
    </KeamananProtection>
  );
}
