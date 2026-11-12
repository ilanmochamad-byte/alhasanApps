import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import type { IconName } from '@/components/app-icon';
import { Chip } from '@/components/ui/chip';

export type FilterPillOption<T extends string> = { value: T; label: string; icon?: IconName };

/**
 * Pil penyaring (perluasan `Chip`): satu baris yang dapat digeser ke samping;
 * terpilih hijau penuh, lainnya krem. Pada teks sistem sangat besar pil
 * membungkus ke baris berikutnya agar semuanya terlihat tanpa menggeser.
 */
export function FilterPills<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: FilterPillOption<T>[];
  value: T;
  onChange: (next: T) => void;
  accessibilityLabel?: string;
}) {
  const { fontScale } = useWindowDimensions();
  const pil = options.map((option) => (
    <Chip
      key={option.value}
      label={option.label}
      icon={option.icon}
      selected={option.value === value}
      accessibilityRole="radio"
      onPress={() => onChange(option.value)}
    />
  ));
  if (fontScale > 1.35) {
    return (
      <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={styles.bungkus}>
        {pil}
      </View>
    );
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={styles.gulir}
      contentContainerStyle={styles.baris}>
      {pil}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  gulir: { flexGrow: 0 },
  baris: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  bungkus: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
