import type { ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { AppIcon, type IconName } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

/**
 * Baris info rincian: ikon · label · nilai. Nilai boleh beberapa baris.
 * `locked` menandai isian yang hanya dapat diubah admin (ikon gembok).
 */
export function InfoRow({
  icon,
  label,
  value,
  locked,
  last,
  trailing,
  children,
  selectable = true,
}: {
  icon?: IconName;
  label: string;
  value: string;
  locked?: boolean;
  /** Baris terakhir tidak menggambar garis pemisah. */
  last?: boolean;
  trailing?: ReactNode;
  /** Isi di bawah label, menggantikan `value` (mis. chip per kelas). `value` tetap dibacakan. */
  children?: ReactNode;
  /** Matikan untuk teks pribadi (alasan izin). */
  selectable?: boolean;
}) {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}${locked ? ', hanya dapat diubah admin' : ''}`}
      style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: theme.divider }]}>
      {icon && fontScale <= 1.35 ? (
        <View style={[styles.ikon, { backgroundColor: theme.primarySoft }]}>
          <AppIcon name={icon} size={18} themeColor="primary" />
        </View>
      ) : null}
      <View style={styles.teks}>
        <ThemedText selectable type="labelSmall" themeColor="textSecondary">
          {label}
        </ThemedText>
        {children ?? (
          <ThemedText selectable={selectable} type="bodyBold">
            {value}
          </ThemedText>
        )}
      </View>
      {trailing}
      {locked ? <AppIcon name="lock" size={16} themeColor="textMuted" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  ikon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  teks: { flex: 1, gap: 2 },
});
