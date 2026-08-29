import { Stack } from 'expo-router/stack';

/**
 * Bilah judul bawaan dimatikan: sejak redesain V2 setiap layar menggambar
 * kepalanya sendiri (judul, ikon aksi, dan lonceng notifikasi). Membiarkan
 * keduanya aktif membuat judul tampil dua kali.
 */
export default function JadwalLayout() {
  return (
    <Stack>
      <Stack.Screen name="schedules" options={{ title: 'Jadwal', headerShown: false }} />
    </Stack>
  );
}
