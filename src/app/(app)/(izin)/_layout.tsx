import { Stack } from 'expo-router/stack';

export default function IzinLayout() {
  return (
    <Stack>
      <Stack.Screen name="perizinan" options={{ title: 'Perizinan', headerLargeTitle: true }} />
    </Stack>
  );
}
