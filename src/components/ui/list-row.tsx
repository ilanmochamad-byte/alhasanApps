import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppIcon, type IconName } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Satu baris menu di dalam `RowGroup`.
 *
 * Redesain tampilan: `subtitle` menjadikannya baris menu berketerangan —
 * keterangan singkat di bawah judul dan ikon dalam kotak lunak — agar
 * pengguna tahu isi menu sebelum membukanya.
 */
export function ListRow({
  icon,
  title,
  subtitle,
  value,
  onPress,
  danger,
  last,
}: {
  icon?: IconName;
  title: string;
  /** Keterangan satu kalimat di bawah judul. */
  subtitle?: string;
  /** Teks kecil di kanan, sebelum tanda panah. */
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  /** Baris terakhir tidak menggambar garis pemisah. */
  last?: boolean;
}) {
  const theme = useTheme();
  const tint = danger ? theme.danger : theme.primary;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={[title, subtitle, value].filter(Boolean).join(', ')}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: 1, borderBottomColor: theme.divider },
        { opacity: pressed ? 0.65 : 1 },
      ]}>
      {icon && subtitle ? (
        <View style={[styles.iconBox, { backgroundColor: danger ? theme.dangerSoft : theme.primarySoft }]}>
          <AppIcon name={icon} size={20} color={tint} />
        </View>
      ) : icon ? (
        <AppIcon name={icon} size={20} color={tint} />
      ) : null}
      <View style={styles.text}>
        <ThemedText selectable type="bodyBold" style={[styles.title, danger && { color: theme.danger }]}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText selectable type="caption" themeColor="textSecondary" style={styles.subtitle}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {value ? (
        <ThemedText selectable type="caption" themeColor="textMuted">
          {value}
        </ThemedText>
      ) : null}
      {onPress ? <AppIcon name="chevron-right" size={17} color={theme.border} /> : null}
    </Pressable>
  );
}

/** Kartu yang membungkus beberapa `ListRow`. */
export function RowGroup({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.group, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    borderWidth: 1,
    borderRadius: Radius.xxl,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
  },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14 },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 14 },
  subtitle: { fontSize: 13, lineHeight: 17 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
