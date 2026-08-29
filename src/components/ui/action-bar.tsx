import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Elevation } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Bilah aksi yang menempel di dasar layar detail.
 *
 * Menaruh keputusan utama di sini membuatnya selalu terjangkau tanpa
 * menggulir. Karena bilah ini berada DI LUAR `KeyboardAwareScrollView`, di iOS
 * ia harus naik sendiri saat papan ketik muncul — tanpa itu tombol Setujui
 * tertutup papan ketik ketika pengguna sedang mengetik alasan. Android memakai
 * `adjustResize`, jendelanya sudah mengecil sendiri, jadi tidak perlu diangkat.
 */
export function ActionBar({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tinggiPapanKetik = useKeyboardHeight();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          paddingBottom: tinggiPapanKetik > 0 ? 12 : Math.max(insets.bottom, 12) + 10,
          marginBottom: tinggiPapanKetik,
          boxShadow: Elevation.bar,
        },
      ]}>
      {children}
    </View>
  );
}

/** Tinggi papan ketik di iOS; selalu 0 di platform lain. */
function useKeyboardHeight() {
  const [tinggi, setTinggi] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const tampil = Keyboard.addListener('keyboardWillShow', (event) =>
      setTinggi(event.endCoordinates.height),
    );
    const sembunyi = Keyboard.addListener('keyboardWillHide', () => setTinggi(0));
    return () => {
      tampil.remove();
      sembunyi.remove();
    };
  }, []);

  return tinggi;
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
