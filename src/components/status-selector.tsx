import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import type { AttendanceStatus } from '@/api/types';
import { AppIcon, type IconName } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const STATUSES: AttendanceStatus[] = ['Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpa'];

/** Ikon status kehadiran; selalu berpasangan dengan teks atau huruf. */
export const IKON_KEHADIRAN: Record<AttendanceStatus, IconName> = {
  Hadir: 'check',
  Terlambat: 'clock',
  Izin: 'izin',
  Sakit: 'medical',
  Alpa: 'close',
};

/**
 * Pemilih status kehadiran: lima tombol sama lebar, ikon + teks. `compact`
 * (baris santri) memakai ikon + huruf awal (H/T/I/S/A) agar lima tombol muat
 * satu baris; nama status lengkap tetap menjadi label aksesibilitas. Pada teks
 * sistem sangat besar tombol membungkus dan menampilkan nama lengkap.
 */
export function StatusSelector({
  value,
  onChange,
  disabled,
  compact,
}: {
  value: AttendanceStatus;
  onChange: (status: AttendanceStatus) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const teksBesar = fontScale > 1.35;
  const ringkas = Boolean(compact) && !teksBesar;
  return (
    <View
      style={[styles.wrap, !ringkas && styles.wrapLebar]}
      accessibilityRole="radiogroup"
      accessibilityLabel="Pilih status kehadiran">
      {STATUSES.map((status) => {
        const selected = status === value;
        const fg = selected ? theme.onPrimary : theme.textSecondary;
        return (
          <Pressable
            key={status}
            accessibilityRole="radio"
            accessibilityLabel={status}
            accessibilityState={{ selected, disabled: Boolean(disabled) }}
            // React Native Web tidak memetakan accessibilityState ke DOM.
            aria-checked={selected}
            disabled={disabled}
            onPress={() => onChange(status)}
            style={({ pressed }) => [
              styles.tombol,
              ringkas ? styles.tombolRingkas : styles.tombolLebar,
              {
                backgroundColor: selected ? theme.primary : theme.backgroundElement,
                borderColor: selected ? theme.primary : theme.border,
                opacity: disabled ? 0.55 : pressed ? 0.8 : 1,
              },
            ]}>
            <AppIcon name={IKON_KEHADIRAN[status]} size={15} color={fg} />
            <ThemedText type="caption" style={{ color: fg, fontWeight: selected ? '800' : '700', fontSize: 13 }}>
              {ringkas ? status[0] : status}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 6 },
  wrapLebar: { flexWrap: 'wrap', gap: 7 },
  tombol: {
    minHeight: TouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: Radius.pill,
  },
  tombolRingkas: { flex: 1, paddingHorizontal: 4 },
  tombolLebar: { paddingHorizontal: 13, paddingVertical: 7 },
});
