import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { AppIcon, type IconName } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { Elevation, Layout, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { barisKisi } from '@/lib/tampilan';

export type StatTone = 'primary' | 'warning' | 'info' | 'violet' | 'danger';
export type StatItem = {
  icon: IconName;
  value: string;
  label: string;
  tone?: StatTone;
  /** Label dibaca sebelum angka (mis. laporan "Terbit (2) Rp300.000"). Bawaan: angka dulu. */
  labelDulu?: boolean;
};

/** Kartu statistik: ikon dalam lingkaran lunak 44 pt, angka besar, label. */
export function StatCard({ icon, value, label, tone = 'primary', labelDulu = false }: StatItem) {
  const theme = useTheme();
  const warna = {
    primary: { bg: theme.primarySoft, fg: theme.primary },
    warning: { bg: theme.warningSoft, fg: theme.warning },
    info: { bg: theme.infoSoft, fg: theme.info },
    violet: { bg: theme.violetSoft, fg: theme.violet },
    danger: { bg: theme.dangerSoft, fg: theme.danger },
  }[tone];
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={[styles.kartu, { backgroundColor: theme.card, borderColor: theme.border, boxShadow: Elevation.card }]}>
      <View style={[styles.ikon, { backgroundColor: warna.bg }]}>
        <AppIcon name={icon} size={22} color={warna.fg} />
      </View>
      {labelDulu ? (
        <ThemedText selectable type="labelSmall" themeColor="textSecondary">
          {label}
        </ThemedText>
      ) : null}
      <ThemedText selectable type="numeralCard">
        {value}
      </ThemedText>
      {labelDulu ? null : (
        <ThemedText selectable type="labelSmall" themeColor="textSecondary">
          {label}
        </ThemedText>
      )}
    </View>
  );
}

/**
 * Kisi statistik 2 kolom; turun ke 1 kolom bila teks sistem > 1,35×. Kartu
 * ganjil terakhir melebar penuh agar tidak menyisakan sel kosong.
 */
export function StatGrid({ items }: { items: StatItem[] }) {
  const { fontScale } = useWindowDimensions();
  const satuKolom = fontScale > 1.35;
  const baris = barisKisi(items, satuKolom ? 1 : 2);
  return (
    <View style={styles.kisi}>
      {baris.map((isi, index) => (
        <View key={index} style={styles.baris}>
          {isi.map((item) => (
            <View key={item.label} style={styles.sel}>
              <StatCard {...item} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  kisi: { gap: Layout.cardGap },
  baris: { flexDirection: 'row', gap: Layout.cardGap },
  sel: { flex: 1 },
  kartu: { flex: 1, borderWidth: 1, borderRadius: Radius.xxl, borderCurve: 'continuous', padding: 16, gap: 6 },
  ikon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
});
