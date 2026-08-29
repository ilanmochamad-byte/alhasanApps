import { Stack } from 'expo-router/stack';

export default function ProfilLayout() {
  return (
    <Stack>
      <Stack.Screen name="profil" options={{ title: 'Profil', headerLargeTitle: true }} />
    </Stack>
  );
}
