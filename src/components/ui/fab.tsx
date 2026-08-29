import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, type IconName } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Tombol aksi mengambang. Menggantikan tombol lebar-penuh yang dulu menumpuk
 * di tengah daftar, sehingga aksi utama tetap terjangkau saat menggulir.
 */
export function Fab({
  label,
  icon = 'plus',
  onPress,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: pressed ? theme.primaryPressed : theme.primary,
          bottom: BottomTabInset + Math.max(insets.bottom, 8) + 12,
          boxShadow: '0 10px 24px rgba(23, 107, 58, 0.34)',
        },
      ]}>
      <AppIcon name={icon} size={20} color={theme.onPrimary} />
      <ThemedText selectable type="bodyBold" style={{ color: theme.onPrimary }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 18,
    minHeight: 52,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingLeft: 17,
    paddingRight: 20,
  },
});
