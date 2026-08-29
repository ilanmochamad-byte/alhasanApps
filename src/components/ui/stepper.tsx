import { StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Penanda langkah untuk alur bertahap.
 *
 * V1 hanya menampilkan tiga kotak sejajar tanpa menandai mana yang sudah
 * selesai; di sini langkah yang lewat diberi centang dan garis penghubungnya
 * ikut berwarna, sehingga posisi pengguna dalam alur terbaca sekilas.
 */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  const theme = useTheme();
  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: steps.length, now: current + 1 }}
      accessibilityLabel={`Langkah ${current + 1} dari ${steps.length}: ${steps[current]}`}>
      {steps.map((label, index) => {
        const selesai = index < current;
        const aktif = index === current;
        return (
          <View key={label} style={styles.item}>
            {index > 0 ? (
              <View
                style={[
                  styles.line,
                  { backgroundColor: index <= current ? theme.primary : theme.border },
                ]}
              />
            ) : null}
            <View style={styles.node}>
              <View
                style={[
                  styles.dot,
                  selesai || aktif
                    ? { backgroundColor: theme.primary, borderColor: theme.primarySoft }
                    : { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  aktif && styles.dotActive,
                ]}>
                {selesai ? (
                  <AppIcon name="check" size={13} color={theme.onPrimary} />
                ) : (
                  <ThemedText
                    selectable
                    style={[
                      styles.dotText,
                      { color: selesai || aktif ? theme.onPrimary : theme.textMuted },
                    ]}>
                    {index + 1}
                  </ThemedText>
                )}
              </View>
              <ThemedText
                selectable
                style={[
                  styles.label,
                  { color: aktif ? theme.text : selesai ? theme.primary : theme.textMuted },
                  aktif && styles.labelActive,
                ]}
                numberOfLines={2}>
                {label}
              </ThemedText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  item: { flex: 1, flexDirection: 'row', alignItems: 'flex-start' },
  line: { flex: 1, height: 2, marginTop: 12 },
  node: { width: 92, alignItems: 'center', gap: 6 },
  dot: {
    width: 26,
    height: 26,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: { borderWidth: 4 },
  dotText: { fontSize: 11, fontWeight: '800' },
  label: { fontSize: 11, lineHeight: 14, fontWeight: '700', textAlign: 'center' },
  labelActive: { fontWeight: '800' },
});
