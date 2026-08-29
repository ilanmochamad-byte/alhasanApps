import { Stack } from 'expo-router/stack';

/**
 * Bilah judul bawaan dimatikan: sejak redesain V2 setiap layar menggambar
 * kepalanya sendiri (judul, ikon aksi, dan lonceng notifikasi). Membiarkan
 * keduanya aktif membuat judul tampil dua kali.
 */
export default function LaporanLayout() {
  return (
    <Stack>
      <Stack.Screen name="reports" options={{ title: 'Laporan', headerShown: false }} />
    </Stack>
  );
}
