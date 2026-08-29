import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Elevation, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Kartu daftar: radius 18, bayangan tipis. */
export function Card({
  children,
  onPress,
  accessibilityLabel,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const base: ViewStyle = {
    backgroundColor: theme.card,
    borderColor: theme.border,
    boxShadow: Elevation.card,
  };
  if (!onPress) return <View style={[styles.card, base, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.card, base, { opacity: pressed ? 0.85 : 1 }, style]}>
      {children}
    </Pressable>
  );
}

/** Panel: radius 20, dipakai untuk blok isian dan ringkasan. */
export function Panel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }, style]}>
      {children}
    </View>
  );
}

export function Divider() {
  const theme = useTheme();
  return <View style={{ height: 1, backgroundColor: theme.divider }} />;
}

/** Judul bagian dengan aksi opsional di kanan. */
export function SectionHeader({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <ThemedText selectable type="h2" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      {trailing}
    </View>
  );
}

/** Label kecil huruf kapital di atas sebuah blok. */
export function Overline({ children }: { children: ReactNode }) {
  return (
    <ThemedText selectable type="overline" themeColor="textMuted">
      {children}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    padding: 14,
    gap: 6,
  },
  panel: {
    borderWidth: 1,
    borderRadius: Radius.xxl,
    borderCurve: 'continuous',
    padding: 16,
    gap: 12,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  sectionTitle: { flex: 1 },
});
