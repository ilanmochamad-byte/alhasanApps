import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppIcon, type IconName } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { Elevation, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Kartu sorot hijau tua (generalisasi `HeroSession`/`HeroPerizinan`): label
 * kecil, isi bebas atau angka besar, dan satu tombol putih. Angka hanya dari
 * data server — komponen ini tidak menghitung pembanding.
 */
export function HeroCard({
  overline,
  value,
  title,
  caption,
  children,
  action,
  testID,
}: {
  overline: string;
  /** Angka besar (mis. saldo, jumlah). */
  value?: string;
  title?: string;
  caption?: string;
  children?: ReactNode;
  action?: { label: string; icon?: IconName; onPress: () => void; /** Nama untuk pembaca layar bila label tampil terlalu umum. */ accessibilityLabel?: string };
  testID?: string;
}) {
  const theme = useTheme();
  return (
    <View
      testID={testID}
      style={[styles.kartu, { backgroundColor: theme.heroSurface, borderColor: theme.heroBorder, boxShadow: Elevation.brand }]}>
      <ThemedText selectable type="overline" style={{ color: theme.heroAccent }}>
        {overline}
      </ThemedText>
      {value ? (
        <ThemedText selectable type="numeralLarge" style={{ color: theme.heroText }}>
          {value}
        </ThemedText>
      ) : null}
      {title ? (
        <ThemedText selectable style={[styles.judul, { color: theme.heroText }]}>
          {title}
        </ThemedText>
      ) : null}
      {children}
      {caption ? (
        <ThemedText selectable type="caption" style={{ color: theme.heroTextSecondary }}>
          {caption}
        </ThemedText>
      ) : null}
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.accessibilityLabel ?? action.label}
          onPress={action.onPress}
          style={({ pressed }) => [styles.tombol, { backgroundColor: theme.card, opacity: pressed ? 0.85 : 1 }]}>
          {action.icon ? <AppIcon name={action.icon} size={19} themeColor="primary" /> : null}
          <ThemedText selectable type="bodyBold" themeColor="primary" style={styles.tombolTeks}>
            {action.label}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  kartu: { borderWidth: 1, borderRadius: Radius.hero, borderCurve: 'continuous', padding: 18, gap: 10 },
  judul: { fontSize: 17, lineHeight: 22, fontWeight: '800' },
  tombol: {
    minHeight: 48,
    marginTop: 4,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  // Boleh membungkus agar teks tombol tidak terpotong pada teks sistem besar.
  tombolTeks: { flexShrink: 1, textAlign: 'center' },
});
