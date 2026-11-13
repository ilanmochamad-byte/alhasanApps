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
  valueCaption,
  iconRotate,
  pill,
  detail,
  highlight,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  selected,
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
  /** Keterangan kecil di bawah nilai kanan (mis. "Saldo", "Sisa"). */
  valueCaption?: string;
  /** Putaran ikon jenis dalam derajat (panah masuk/keluar). */
  iconRotate?: number;
  /** Biasanya `<StatusPill />`. */
  pill?: ReactNode;
  /** Isi tambahan di bawah subjudul (rentang tanggal, alasan, keterangan). */
  detail?: ReactNode;
  /** Garis tepi penanda "perlu tindakan" (selalu disertai teks di `pill`/`detail`). */
  highlight?: 'warning' | 'primary';
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Keterangan tambahan yang dibacakan sesudah nama (mis. kerahasiaan kasus). */
  accessibilityHint?: string;
  /** `radio` untuk baris pilihan tunggal (mis. pilih santri). */
  accessibilityRole?: 'button' | 'radio';
  selected?: boolean;
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
    <View style={bertumpuk ? undefined : styles.nilaiKolom}>
      <ThemedText selectable type="bodyBold" themeColor={valueTone ?? 'text'} style={styles.nilai}>
        {value}
      </ThemedText>
      {valueCaption ? (
        <ThemedText selectable type="caption" themeColor="textSecondary" style={bertumpuk ? undefined : styles.nilai}>
          {valueCaption}
        </ThemedText>
      ) : null}
    </View>
  ) : null;
  return (
    <Pressable
      accessibilityRole={onPress ? (accessibilityRole ?? 'button') : undefined}
      accessibilityState={accessibilityRole === 'radio' ? { selected: Boolean(selected) } : undefined}
      aria-checked={accessibilityRole === 'radio' ? Boolean(selected) : undefined}
      accessibilityLabel={accessibilityLabel ?? [title, subtitle, value].filter(Boolean).join(', ')}
      accessibilityHint={accessibilityHint}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.baris,
        {
          backgroundColor: selected ? theme.primarySoft : theme.card,
          borderColor: selected ? theme.primary : highlight === 'warning' ? theme.warningBorder : highlight === 'primary' ? theme.primary : theme.border,
          boxShadow: Elevation.card,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      {/* Teks sistem sangat besar: avatar/ikon (hiasan) disembunyikan agar judul
          mendapat lebar penuh dan tidak terpecah di tengah kata. */}
      {bertumpuk ? null : avatarName ? (
        <AvatarInisial nama={avatarName} tone={tone} />
      ) : icon ? (
        <View style={[styles.ikon, { backgroundColor: warna.bg }]}>
          <AppIcon name={icon} size={20} color={warna.fg} rotate={iconRotate} />
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
        {detail}
        {pill ? <View style={styles.pil}>{pill}</View> : null}
      </View>
      {bertumpuk ? null : nilai}
      {selected ? (
        <AppIcon name="check" size={20} themeColor="primary" />
      ) : onPress && accessibilityRole !== 'radio' ? (
        <AppIcon name="chevron-right" size={18} themeColor="textMuted" />
      ) : null}
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
  nilai: { fontVariant: ['tabular-nums'], textAlign: 'right' },
  nilaiKolom: { alignItems: 'flex-end', maxWidth: '45%' },
  pil: { paddingTop: 4 },
});
