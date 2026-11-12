import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppIcon, type IconName } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

/**
 * Panel hasil (pola P-Sukses): lingkaran ikon besar, judul, keterangan, dan
 * tombol lanjutan dari pemanggil. `tone="menunggu"` (jam jingga) untuk hasil
 * yang belum final, mis. transfer menunggu verifikasi — bukan centang.
 */
export function SuccessPanel({
  title,
  message,
  tone = 'berhasil',
  icon,
  children,
}: {
  title: string;
  message?: string;
  tone?: 'berhasil' | 'menunggu';
  icon?: IconName;
  children?: ReactNode;
}) {
  const theme = useTheme();
  const menunggu = tone === 'menunggu';
  const fg = menunggu ? theme.warning : theme.primary;
  return (
    <View style={styles.panel} accessibilityLiveRegion="polite">
      <View style={[styles.lingkaranLuar, { backgroundColor: menunggu ? theme.warningSoft : theme.primarySoft }]}>
        <View style={[styles.lingkaran, { borderColor: fg, backgroundColor: theme.card }]}>
          <AppIcon name={icon ?? (menunggu ? 'clock' : 'check')} size={34} color={fg} />
        </View>
      </View>
      <ThemedText selectable type="h1" accessibilityRole="header" style={[styles.tengah, { color: fg }]}>
        {title}
      </ThemedText>
      {message ? (
        <ThemedText selectable type="body" themeColor="textSecondary" style={styles.tengah}>
          {message}
        </ThemedText>
      ) : null}
      {children ? <View style={styles.aksi}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { alignItems: 'center', gap: 10, paddingVertical: 12 },
  lingkaranLuar: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  lingkaran: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  tengah: { textAlign: 'center' },
  aksi: { alignSelf: 'stretch', gap: 10, paddingTop: 10 },
});
