import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, type IconName } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { Elevation, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Tinggi FAB; daftar di bawahnya memberi ruang `FAB_RUANG_BAWAH`. */
export const FAB_TINGGI = 56;
export const FAB_RUANG_BAWAH = FAB_TINGGI + 16;

/**
 * Tombol mengambang ikon + teks (K-8): pil hijau 56 pt di kanan bawah.
 * `bottomOffset` adalah jarak dari dasar wadah ke tepi bawah tombol — diisi
 * pemanggil dari tinggi bilah tab sistem + 16, bukan angka tetap. Pemanggil
 * yang menyembunyikannya saat papan ketik terbuka cukup tidak menggambarnya.
 */
export function Fab({
  label,
  icon = 'plus',
  onPress,
  accessibilityLabel,
  bottomOffset = 16,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  accessibilityLabel?: string;
  bottomOffset?: number;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        {
          right: 16 + insets.right,
          bottom: bottomOffset,
          backgroundColor: pressed ? theme.primaryPressed : theme.primary,
          boxShadow: Elevation.floating,
        },
      ]}>
      <AppIcon name={icon} size={22} color={theme.onPrimary} />
      <ThemedText type="bodyBold" style={[styles.teks, { color: theme.onPrimary }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    minHeight: FAB_TINGGI,
    maxWidth: '80%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radius.pill,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  teks: { fontWeight: '800', flexShrink: 1 },
});
