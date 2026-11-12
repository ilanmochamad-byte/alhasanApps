import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { tinggiBatang } from '@/lib/tampilan';

export type BarDatum = { key: string; label: string; value: number; /** Teks nilai (mis. "Rp 300.000"); bawaan angka apa adanya. */ display?: string };

/**
 * Grafik batang berbasis `View` (K-4: tanpa `react-native-svg`). Nilai batang
 * terpilih tampil di atasnya; setiap batang dapat diketuk dan dibacakan
 * pembaca layar sebagai "label: nilai". Hanya menampilkan data pemanggil —
 * tanpa garis tren atau pembanding karangan.
 */
export function BarChart({
  data,
  height = 140,
  accessibilityLabel,
  initialKey,
}: {
  data: BarDatum[];
  height?: number;
  accessibilityLabel?: string;
  initialKey?: string;
}) {
  const theme = useTheme();
  const [terpilih, setTerpilih] = useState<string | undefined>(initialKey);
  const rasio = tinggiBatang(data.map((d) => d.value));
  return (
    <View accessibilityLabel={accessibilityLabel} style={styles.grafik}>
      {data.map((d, i) => {
        const aktif = d.key === terpilih;
        const nilai = d.display ?? String(d.value);
        return (
          <Pressable
            key={d.key}
            accessibilityRole="button"
            accessibilityLabel={`${d.label}: ${nilai}`}
            accessibilityState={{ selected: aktif }}
            onPress={() => setTerpilih(aktif ? undefined : d.key)}
            style={styles.kolom}>
            <ThemedText type="caption" numberOfLines={1} style={[styles.nilai, { color: theme.primary, opacity: aktif ? 1 : 0 }]}>
              {nilai}
            </ThemedText>
            <View style={[styles.lintasan, { height, backgroundColor: theme.backgroundElement }]}>
              <View
                style={[
                  styles.batang,
                  { height: `${Math.max(rasio[i] * 100, d.value > 0 ? 3 : 0)}%`, backgroundColor: aktif ? theme.primary : theme.primaryBorder },
                ]}
              />
            </View>
            <ThemedText type="caption" themeColor={aktif ? 'text' : 'textSecondary'} style={styles.label}>
              {d.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grafik: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  kolom: { flex: 1, alignItems: 'center', gap: 6, minHeight: 44 },
  nilai: { fontWeight: '800', textAlign: 'center' },
  lintasan: { alignSelf: 'stretch', borderRadius: Radius.sm, justifyContent: 'flex-end', overflow: 'hidden' },
  batang: { borderRadius: Radius.sm },
  label: { textAlign: 'center' },
});
