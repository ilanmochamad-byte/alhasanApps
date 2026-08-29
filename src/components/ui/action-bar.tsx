import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Elevation } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Bilah aksi yang menempel di dasar layar detail.
 *
 * Menaruh keputusan utama di sini membuatnya selalu terjangkau tanpa
 * menggulir — dulu tombol-tombol itu berderet di tengah badan layar.
 */
export function ActionBar({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          paddingBottom: Math.max(insets.bottom, 12) + 10,
          boxShadow: Elevation.bar,
        },
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
});
