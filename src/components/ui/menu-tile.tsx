import { Pressable, StyleSheet, View } from 'react-native';

import { AppIcon, type IconName } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type MenuTileTone = 'primary' | 'warning' | 'info' | 'violet';

export type MenuTileItem = {
  icon: IconName;
  label: string;
  tone?: MenuTileTone;
  onPress: () => void;
};

/**
 * Kisi menu Beranda (redesain tampilan, Konsep A): ubin besar, tetap tiga
 * kolom berapa pun jumlah ubin yang tampil. Sel kosong di baris terakhir diisi
 * pengganjal tak terlihat agar ubin tidak melebar.
 */
export function MenuTileGrid({ items }: { items: MenuTileItem[] }) {
  const sisa = (3 - (items.length % 3)) % 3;
  const baris: (MenuTileItem | null)[][] = [];
  const isi: (MenuTileItem | null)[] = [...items, ...Array<null>(sisa).fill(null)];
  for (let i = 0; i < isi.length; i += 3) baris.push(isi.slice(i, i + 3));

  return (
    <View style={styles.grid}>
      {baris.map((row, index) => (
        <View key={index} style={styles.row}>
          {row.map((item, col) =>
            item ? <MenuTile key={item.label} {...item} /> : <View key={`kosong-${col}`} style={styles.spacer} />,
          )}
        </View>
      ))}
    </View>
  );
}

export function MenuTile({ icon, label, tone = 'primary', onPress }: MenuTileItem) {
  const theme = useTheme();
  const palette = {
    primary: { bg: theme.primarySoft, fg: theme.primary },
    warning: { bg: theme.warningSoft, fg: theme.warning },
    info: { bg: theme.infoSoft, fg: theme.info },
    violet: { bg: theme.violetSoft, fg: theme.violet },
  }[tone];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.75 : 1 },
      ]}>
      <View style={[styles.iconBox, { backgroundColor: palette.bg }]}>
        <AppIcon name={icon} size={26} color={palette.fg} />
      </View>
      {/* Label mengikuti ukuran teks sistem sepenuhnya. Bila tidak muat, label
          turun ke baris berikutnya pada batas kata dan ubin memanjang; ubin
          dalam satu baris kisi tetap sama tinggi. */}
      <ThemedText style={styles.label}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  spacer: { flex: 1 },
  tile: {
    flex: 1,
    minHeight: 112,
    borderWidth: 1,
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 14, lineHeight: 18, fontWeight: '700', textAlign: 'center' },
});
