import { View, StyleSheet } from 'react-native';

import type { AttendanceStatus } from '@/api/types';
import { Chip } from '@/components/ui/chip';

const STATUSES: AttendanceStatus[] = ['Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpa'];

export function StatusSelector({
  value,
  onChange,
  disabled,
}: {
  value: AttendanceStatus;
  onChange: (status: AttendanceStatus) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel="Pilih status kehadiran">
      {STATUSES.map((status) => (
        <Chip
          key={status}
          accessibilityRole="radio"
          label={status}
          selected={status === value}
          disabled={disabled}
          onPress={() => onChange(status)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
});
