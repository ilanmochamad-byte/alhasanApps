import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Elevation, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ReceiptRow = { label: string; value: string; emphasis?: boolean };

/**
 * Kartu kuitansi: kop Al Hasan, garis putus, baris label–nilai, dan baris
 * penutup yang disorot. Isi sepenuhnya dari pemanggil (data server); kartu
 * ini bukan dokumen cetak — cetak/PDF tetap dari website (keputusan T-1 V6).
 */
export function ReceiptCard({
  title,
  subtitle,
  rows,
  footer,
}: {
  title: string;
  subtitle?: string;
  rows: ReceiptRow[];
  footer?: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.kartu, { backgroundColor: theme.card, borderColor: theme.border, boxShadow: Elevation.card }]}>
      <View style={styles.kop}>
        <ThemedText selectable type="overline" themeColor="primary">
          PESANTREN AL HASAN
        </ThemedText>
        <ThemedText selectable type="h2">
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText selectable type="caption" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      <View style={[styles.putus, { borderColor: theme.border }]} />
      <View style={styles.baris}>
        {rows.map((row) => (
          <View key={row.label} style={styles.barisIsi} accessible accessibilityLabel={`${row.label}: ${row.value}`}>
            <ThemedText selectable type={row.emphasis ? 'bodyBold' : 'labelSmall'} themeColor={row.emphasis ? 'text' : 'textSecondary'} style={styles.label}>
              {row.label}
            </ThemedText>
            <ThemedText selectable type={row.emphasis ? 'numeralCard' : 'bodyBold'} style={styles.nilai}>
              {row.value}
            </ThemedText>
          </View>
        ))}
      </View>
      {footer ? (
        <>
          <View style={[styles.putus, { borderColor: theme.border }]} />
          <ThemedText selectable type="caption" themeColor="textSecondary" style={styles.kaki}>
            {footer}
          </ThemedText>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  kartu: { borderWidth: 1, borderRadius: Radius.xxl, borderCurve: 'continuous', padding: 18, gap: 14 },
  kop: { alignItems: 'center', gap: 4 },
  putus: { borderTopWidth: 1.5, borderStyle: 'dashed' },
  baris: { gap: 10 },
  barisIsi: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 12, rowGap: 2 },
  label: { flexGrow: 1 },
  nilai: { textAlign: 'right', flexShrink: 1 },
  kaki: { textAlign: 'center' },
});
