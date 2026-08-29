import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppIcon, type IconName } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Chip pilih. Tingginya 36 px agar daftar tetap padat; `hitSlop` menambal
 * selisihnya sampai 44 px sesuai pedoman area sentuh.
 */
export function Chip({
  label,
  selected,
  onPress,
  disabled,
  icon,
  accessibilityRole = 'button',
  style,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  icon?: IconName;
  accessibilityRole?: 'button' | 'radio' | 'tab';
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const fg = selected ? theme.onPrimary : theme.textSecondary;
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityState={{ selected: Boolean(selected), disabled: Boolean(disabled) }}
      disabled={disabled || !onPress}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.primary : theme.backgroundElement,
          borderColor: selected ? theme.primary : theme.border,
          opacity: disabled ? 0.55 : pressed ? 0.8 : 1,
        },
        style,
      ]}>
      {icon ? <AppIcon name={icon} size={15} color={fg} /> : null}
      <ThemedText selectable type="caption" style={{ color: fg, fontWeight: selected ? '800' : '700', fontSize: 13 }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** Lencana statis: latar lunak + teks berwarna. */
export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'primary' | 'warning' | 'danger';
}) {
  const theme = useTheme();
  const map = {
    neutral: { bg: theme.backgroundElement, border: theme.border, fg: theme.textSecondary },
    primary: { bg: theme.primarySoft, border: theme.primaryBorder, fg: theme.primary },
    warning: { bg: theme.warningSoft, border: theme.warningBorder, fg: theme.warning },
    danger: { bg: theme.dangerSoft, border: theme.dangerBorder, fg: theme.danger },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: map.bg, borderColor: map.border }]}>
      <ThemedText selectable type="overline" style={{ color: map.fg, letterSpacing: 0 }}>
        {label}
      </ThemedText>
    </View>
  );
}

/** Lencana angka bulat (mis. jumlah antrean). */
export function CountBadge({ value, tone = 'primary' }: { value: number | string; tone?: 'primary' | 'danger' }) {
  const theme = useTheme();
  const bg = tone === 'danger' ? theme.danger : theme.primary;
  return (
    <View style={[styles.count, { backgroundColor: bg }]}>
      <ThemedText selectable style={{ color: theme.onPrimary, fontSize: 11, fontWeight: '800' }}>
        {value}
      </ThemedText>
    </View>
  );
}

/** Bungkus baris chip yang boleh membungkus ke baris berikutnya. */
export function ChipRow({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  badge: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  count: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
