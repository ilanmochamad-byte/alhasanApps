import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView as TabSafeAreaView } from 'react-native-screens/experimental';
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
  area: { flex: 1 },
});

/** `true` selama papan ketik perangkat lunak terbuka (native). */
export function useKeyboardVisible() {
  const [tampak, setTampak] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const buka = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setTampak(true));
    const tutup = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setTampak(false));
    return () => {
      buka.remove();
      tutup.remove();
    };
  }, []);
  return tampak;
}

/**
 * Lapisan FAB layar tab (K-8). Jarak ke bilah tab TIDAK memakai angka tetap:
 *  - iOS: `SafeAreaView` milik react-native-screens membaca area aman bawah
 *    dari sistem, termasuk bilah tab Liquid Glass (ikut turun saat bilah
 *    menyusut ketika digulir);
 *  - Android: isi layar tab sudah dibungkus area aman bawah oleh native tabs,
 *    sehingga dasar wadah = tepi atas bilah Material 3;
 *  - web: bilah tab berada sesudah isi dalam alur tata letak, sehingga
 *    dasar wadah = tepi atas bilah tab.
 * FAB tidak digambar saat papan ketik terbuka atau `hidden` (kotak cari aktif).
 * Lapisan tidak menangkap sentuhan di luar tombol.
 */
export function FabArea({ hidden, children }: { hidden?: boolean; children: ReactNode }) {
  const papanKetik = useKeyboardVisible();
  if (hidden || papanKetik) return null;
  if (Platform.OS === 'ios') {
    return (
      <TabSafeAreaView edges={{ bottom: true }} pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <View pointerEvents="box-none" style={styles.area}>
          {children}
        </View>
      </TabSafeAreaView>
    );
  }
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {children}
    </View>
  );
}
