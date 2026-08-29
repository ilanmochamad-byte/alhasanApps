import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Kotak angka ringkas. `tone="primary"` untuk angka yang paling penting. */
export function StatTile({
  label,
  value,
  tone = 'neutral',
  compact,
}: {
  label: string;
  value: number | string;
  tone?: 'neutral' | 'primary';
  /** Versi pendek untuk deret empat kolom. */
  compact?: boolean;
}) {
  const theme = useTheme();
  const primary = tone === 'primary';
  return (
    <View
      style={[
        styles.tile,
        compact && styles.tileCompact,
        primary
          ? { backgroundColor: theme.primary, borderColor: theme.primary }
          : { backgroundColor: theme.card, borderColor: theme.border },
      ]}>
      <ThemedText
        selectable
        style={[
          compact ? styles.valueCompact : styles.value,
          { color: primary ? theme.onPrimary : theme.text },
        ]}>
        {value}
      </ThemedText>
      <ThemedText
        selectable
        type="overline"
        style={{ color: primary ? theme.heroTextSecondary : theme.textMuted }}>
        {label.toUpperCase()}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    padding: 14,
    gap: 3,
    justifyContent: 'center',
  },
  tileCompact: { paddingHorizontal: 10, paddingVertical: 10, minHeight: 62 },
  value: { fontSize: 30, lineHeight: 34, fontWeight: '800', fontVariant: ['tabular-nums'] },
  valueCompact: { fontSize: 19, lineHeight: 23, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
