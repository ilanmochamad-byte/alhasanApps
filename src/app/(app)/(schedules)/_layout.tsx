import { Stack } from 'expo-router/stack';

export default function SchedulesLayout() {
  return <Stack><Stack.Screen name="schedules" options={{ title: 'Jadwal', headerLargeTitle: true }} /></Stack>;
}
