import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SegmentTab<T extends string> = { value: T; label: string };

/**
 * Tab segmen (perluasan `Segmented`): bagian terpilih hijau penuh di dalam
 * lintasan krem. Untuk berpindah bagian dalam satu rincian (Ringkasan /
 * Tagihan / Tabungan). Pada teks sistem sangat besar tab ditumpuk.
 */
export function SegmentTabs<T extends string>({
  tabs,
  value,
  onChange,
  accessibilityLabel,
}: {
  tabs: SegmentTab<T>[];
  value: T;
  onChange: (next: T) => void;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const bertumpuk = fontScale > 1.35;
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.lintasan, bertumpuk && styles.bertumpuk, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      {tabs.map((tab) => {
        const terpilih = tab.value === value;
        return (
          <Pressable
            key={tab.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: terpilih }}
            aria-selected={terpilih}
            onPress={() => onChange(tab.value)}
            style={({ pressed }) => [
              styles.tab,
              !bertumpuk && styles.tabRata,
              terpilih && { backgroundColor: theme.primary },
              { opacity: pressed && !terpilih ? 0.7 : 1 },
            ]}>
            <ThemedText
              type="labelSmall"
              style={[styles.teks, { color: terpilih ? theme.onPrimary : theme.textSecondary, fontWeight: terpilih ? '800' : '700' }]}>
              {tab.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  lintasan: { flexDirection: 'row', gap: 4, padding: 4, borderWidth: 1, borderRadius: Radius.pill },
  bertumpuk: { flexDirection: 'column', borderRadius: Radius.xxl },
  tab: {
    minHeight: TouchTarget,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabRata: { flex: 1 },
  teks: { textAlign: 'center' },
});
