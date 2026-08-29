import { Pressable, StyleSheet, View } from 'react-native';

import { AppIcon, type IconName } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Tombol ikon 44 × 44 di bilah judul. `badge` dipakai lonceng notifikasi:
 * angka bila ada yang belum dibaca, titik bila hanya penanda.
 */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  badge,
  plain,
  disabled,
}: {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  badge?: number | 'dot';
  /** Tanpa latar dan garis tepi (mis. tombol kembali). */
  plain?: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const showBadge = badge === 'dot' || (typeof badge === 'number' && badge > 0);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        !plain && { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
        { opacity: disabled ? 0.5 : pressed ? 0.7 : 1 },
      ]}>
      <AppIcon name={icon} size={21} />
      {showBadge ? (
        badge === 'dot' ? (
          <View style={[styles.dot, { backgroundColor: theme.danger, borderColor: theme.card }]} />
        ) : (
          <View style={[styles.badge, { backgroundColor: theme.danger, borderColor: theme.card }]}>
            <ThemedText style={[styles.badgeText, { color: '#FFFFFF' }]}>
              {typeof badge === 'number' && badge > 99 ? '99+' : badge}
            </ThemedText>
          </View>
        )
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { position: 'absolute', top: 6, right: 6, width: 9, height: 9, borderRadius: 999, borderWidth: 2 },
  badge: {
    position: 'absolute',
    top: 5,
    right: 5,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, lineHeight: 13, fontWeight: '800' },
});
