import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { AppIcon, type IconName } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { AvatarInisial, type AvatarTone } from '@/components/ui/avatar-inisial';
import { Elevation, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Baris entitas daftar: avatar inisial ATAU ikon bulat, judul, subjudul, nilai
 * di kanan, pil di bawah, dan › bila dapat dibuka. Seluruh baris satu tombol.
 * Pada teks sistem sangat besar nilai turun ke bawah judul agar judul tidak
 * terperas.
 */
export function EntityRow({
  avatarName,
  icon,
  tone = 'primary',
  title,
  subtitle,
  value,
  valueTone,
  pill,
  onPress,
  accessibilityLabel,
}: {
  /** Nama untuk avatar inisial (santri/orang). */
  avatarName?: string;
  /** Ikon jenis; dipakai bila `avatarName` tidak diisi. */
  icon?: IconName;
  tone?: AvatarTone;
  title: string;
  subtitle?: string;
  /** Nilai ringkas di kanan (nominal, waktu). */
  value?: string;
  valueTone?: 'text' | 'primary' | 'warning' | 'danger';
  /** Biasanya `<StatusPill />`. */
  pill?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const bertumpuk = fontScale > 1.35;
  const warna = {
    primary: { bg: theme.primarySoft, fg: theme.primary },
    warning: { bg: theme.warningSoft, fg: theme.warning },
    info: { bg: theme.infoSoft, fg: theme.info },
    violet: { bg: theme.violetSoft, fg: theme.violet },
    danger: { bg: theme.dangerSoft, fg: theme.danger },
  }[tone];
  const nilai = value ? (
    <ThemedText selectable type="bodyBold" themeColor={valueTone ?? 'text'} style={styles.nilai}>
      {value}
    </ThemedText>
  ) : null;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel ?? [title, subtitle, value].filter(Boolean).join(', ')}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.baris,
        { backgroundColor: theme.card, borderColor: theme.border, boxShadow: Elevation.card, opacity: pressed ? 0.85 : 1 },
      ]}>
      {avatarName ? (
        <AvatarInisial nama={avatarName} tone={tone} />
      ) : icon ? (
        <View style={[styles.ikon, { backgroundColor: warna.bg }]}>
          <AppIcon name={icon} size={20} color={warna.fg} />
        </View>
      ) : null}
      <View style={styles.isi}>
        <ThemedText selectable type="bodyBold">
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText selectable type="caption" themeColor="textSecondary" style={styles.sub}>
            {subtitle}
          </ThemedText>
        ) : null}
        {bertumpuk ? nilai : null}
        {pill ? <View style={styles.pil}>{pill}</View> : null}
      </View>
      {bertumpuk ? null : nilai}
      {onPress ? <AppIcon name="chevron-right" size={18} themeColor="textMuted" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  baris: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: Radius.xxl,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  ikon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  isi: { flex: 1, gap: 2 },
  sub: { fontSize: 13, lineHeight: 18 },
  nilai: { fontVariant: ['tabular-nums'] },
  pil: { paddingTop: 4 },
});
