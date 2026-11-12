import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader, type HeaderMenuItem } from '@/components/screen-header';
import { Layout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Kerangka layar stack (redesain gelombang 2, K-7 dan K-10): kepala
 * ← · judul tengah · ⋯ berada DI LUAR area gulir sehingga tombol kembali
 * selalu terjangkau — juga saat layar masih memuat, gagal, atau ditolak
 * server. Isi (`children`) mengatur gulirnya sendiri.
 */
export function StackScreen({
  title,
  subtitle,
  menu,
  onBack,
  backLabel,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  menu?: HeaderMenuItem[];
  onBack?: () => void;
  backLabel?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.kepala, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader variant="stack" title={title} subtitle={subtitle} menu={menu} onBack={onBack} backLabel={backLabel} actions={actions} />
      </View>
      <View style={styles.isi}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  kepala: { paddingHorizontal: Layout.screen, maxWidth: 760, width: '100%', alignSelf: 'center' },
  isi: { flex: 1 },
});
