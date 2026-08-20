import { Pressable, StyleSheet, View } from 'react-native';

import type { AttendanceStatus } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

const STATUSES: AttendanceStatus[] = ['Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpa'];

export function StatusSelector({ value, onChange }: { value: AttendanceStatus; onChange: (status: AttendanceStatus) => void }) {
  const theme = useTheme();
  return <View style={styles.wrap} accessibilityRole="radiogroup">{STATUSES.map((status) => {
    const selected = status === value;
    return <Pressable key={status} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => onChange(status)} style={({ pressed }) => [styles.option, { backgroundColor: selected ? theme.primary : theme.backgroundElement, borderColor: selected ? theme.primary : theme.border, opacity: pressed ? 0.75 : 1 }]}><ThemedText selectable type="smallBold" style={{ color: selected ? theme.onPrimary : theme.text }}>{status}</ThemedText></Pressable>;
  })}</View>;
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  option: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
});
