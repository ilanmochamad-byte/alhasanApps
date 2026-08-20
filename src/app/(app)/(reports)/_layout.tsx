import { Stack } from 'expo-router/stack';

export default function ReportsLayout() {
  return <Stack><Stack.Screen name="reports" options={{ title: 'Laporan', headerLargeTitle: true }} /></Stack>;
}
