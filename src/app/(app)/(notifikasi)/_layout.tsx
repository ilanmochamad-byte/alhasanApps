import { Stack } from 'expo-router/stack';

export default function NotifikasiLayout() {
  return (
    <Stack>
      <Stack.Screen name="notifikasi" options={{ title: 'Notifikasi', headerLargeTitle: true }} />
    </Stack>
  );
}
