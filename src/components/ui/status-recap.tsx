import { StyleSheet, View } from 'react-native';

import type { AttendanceStatus } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

/**
 * Urutan segmen sengaja Hadir → Izin → Terlambat → Sakit → Alpa.
 *
 * Pada urutan inilah pasangan warna yang bersebelahan lolos uji keterbedaan
 * untuk penglihatan warna deutan/protan. Mengubah urutannya membuat biru dan
 * ungu bersinggungan dan menjadi sulit dibedakan.
 */
const URUTAN: AttendanceStatus[] = ['Hadir', 'Izin', 'Terlambat', 'Sakit', 'Alpa'];

export function statusPalette(theme: ReturnType<typeof useTheme>): Record<AttendanceStatus, string> {
  return {
    Hadir: theme.statusHadir,
    Izin: theme.statusIzin,
    Terlambat: theme.statusTerlambat,
    Sakit: theme.statusSakit,
    Alpa: theme.statusAlpa,
  };
}

/**
 * Rekap kehadiran: satu batang proporsi ditambah legenda berlabel.
 *
 * Warna tidak pernah menjadi satu-satunya penanda — setiap segmen punya baris
 * legenda dengan nama status, jumlah, dan persentase.
 */
export function StatusRecap({
  statuses,
  total,
}: {
  statuses: Record<AttendanceStatus, number>;
  total: number;
}) {
  const theme = useTheme();
  const palette = statusPalette(theme);
  const jumlahTotal = total || URUTAN.reduce((sum, key) => sum + (statuses[key] ?? 0), 0);
  const terisi = URUTAN.filter((key) => (statuses[key] ?? 0) > 0);

  return (
    <View style={styles.wrap}>
      {jumlahTotal > 0 ? (
        <View style={styles.bar} accessibilityRole="image" accessibilityLabel="Proporsi status kehadiran">
          {terisi.map((key, index) => (
            <View
              key={key}
              style={[
                styles.segment,
                {
                  flex: statuses[key],
                  backgroundColor: palette[key],
                  borderTopLeftRadius: index === 0 ? 7 : 4,
                  borderBottomLeftRadius: index === 0 ? 7 : 4,
                  borderTopRightRadius: index === terisi.length - 1 ? 7 : 4,
                  borderBottomRightRadius: index === terisi.length - 1 ? 7 : 4,
                },
              ]}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.legend}>
        {URUTAN.map((key) => {
          const nilai = statuses[key] ?? 0;
          const persen = jumlahTotal > 0 ? Math.round((nilai / jumlahTotal) * 100) : 0;
          return (
            <View key={key} style={styles.legendRow}>
              <View style={[styles.swatch, { backgroundColor: palette[key] }]} />
              <ThemedText selectable type="caption" style={styles.legendLabel}>
                {key}
              </ThemedText>
              <ThemedText selectable type="label" style={styles.legendValue}>
                {nilai}
              </ThemedText>
              <ThemedText selectable type="caption" themeColor="textMuted" style={styles.legendPercent}>
                {persen}%
              </ThemedText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  bar: { flexDirection: 'row', gap: 2, height: 14 },
  segment: { height: 14 },
  legend: { gap: 9 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  swatch: { width: 11, height: 11, borderRadius: 3 },
  legendLabel: { flex: 1, fontSize: 13 },
  legendValue: { fontVariant: ['tabular-nums'] },
  legendPercent: { width: 38, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
