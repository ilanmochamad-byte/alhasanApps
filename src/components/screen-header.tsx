import type { ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { NotificationBell } from '@/components/notification-bell';
import { ThemedText } from '@/components/themed-text';
import { IconButton } from '@/components/ui/icon-button';

/**
 * Bilah judul layar utama: judul besar di kiri, aksi di kanan, dan lonceng
 * notifikasi paling kanan. `onBack` menambahkan tombol kembali untuk layar
 * yang dibuka dari Beranda tetapi tetap menggambar kepalanya sendiri.
 */
export function ScreenHeader({
  title,
  actions,
  bell = true,
  onBack,
}: {
  title: string;
  actions?: ReactNode;
  bell?: boolean;
  onBack?: () => void;
}) {
  const { fontScale } = useWindowDimensions();
  const tombol = (
    <>
      {actions}
      {bell ? <NotificationBell /> : null}
    </>
  );
  // Teks sistem sangat besar: tombol aksi naik ke baris sendiri agar judul
  // mendapat lebar penuh dan tidak terpecah di tengah kata.
  if (fontScale > 1.35) {
    return (
      <View style={styles.stack}>
        <View style={styles.row}>
          {onBack ? (
            <IconButton icon="chevron-left" plain accessibilityLabel="Kembali" onPress={onBack} />
          ) : null}
          <View style={styles.spacer} />
          {tombol}
        </View>
        <ThemedText selectable type="h1">
          {title}
        </ThemedText>
      </View>
    );
  }
  return (
    <View style={styles.row}>
      {onBack ? (
        <IconButton icon="chevron-left" plain accessibilityLabel="Kembali" onPress={onBack} />
      ) : null}
      <ThemedText selectable type="h1" style={styles.title}>
        {title}
      </ThemedText>
      {tombol}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 10 },
  title: { flex: 1 },
  stack: { gap: 6, paddingBottom: 10 },
  spacer: { flex: 1 },
});
