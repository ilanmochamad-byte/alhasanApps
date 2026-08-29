import { Pressable, StyleSheet, View } from 'react-native';

import { CountBadge } from '@/components/ui/chip';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  /** Angka opsional di kanan label. */
  count?: number;
};

/**
 * Kontrol tersegmentasi. Menggantikan deret tombol penuh yang dulu dipakai
 * untuk memilih tampilan (antrean/semua) dan saringan notifikasi.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  /**
   * `tab` untuk berpindah tampilan, `radio` untuk memilih saringan. Peran yang
   * tepat menentukan bagaimana pembaca layar mengumumkannya.
   */
  variant = 'tab',
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
  accessibilityLabel?: string;
  variant?: 'tab' | 'radio';
}) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole={variant === 'radio' ? 'radiogroup' : 'tablist'}
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole={variant === 'radio' ? 'radio' : 'tab'}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            hitSlop={4}
            style={({ pressed }) => [
              styles.segment,
              selected && { backgroundColor: theme.card, boxShadow: '0 1px 3px rgba(18, 42, 25, 0.10)' },
              { opacity: pressed && !selected ? 0.7 : 1 },
            ]}>
            <ThemedText
              selectable
              type="caption"
              style={{
                fontSize: 13,
                fontWeight: selected ? '800' : '700',
                color: selected ? theme.text : theme.textSecondary,
              }}>
              {option.label}
            </ThemedText>
            {typeof option.count === 'number' && option.count > 0 ? (
              <CountBadge value={option.count > 99 ? '99+' : option.count} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 48,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    padding: 4,
    flexDirection: 'row',
    gap: 4,
  },
  segment: {
    flex: 1,
    borderRadius: 11,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
});
