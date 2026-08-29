import { Stack } from 'expo-router/stack';

/**
 * Bilah judul bawaan dimatikan: sejak redesain V2 setiap layar menggambar
 * kepalanya sendiri (judul, ikon aksi, dan lonceng notifikasi). Membiarkan
 * keduanya aktif membuat judul tampil dua kali.
 */
export default function BerandaLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Beranda', headerShown: false }} />
    </Stack>
  );
}
