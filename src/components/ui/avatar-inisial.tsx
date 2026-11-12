import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { inisialNama } from '@/lib/tampilan';

export type AvatarTone = 'primary' | 'warning' | 'info' | 'violet' | 'danger';

/** Avatar inisial bulat. Hiasan: nama dibacakan oleh baris yang memuatnya. */
export function AvatarInisial({ nama, ukuran = 44, tone = 'primary' }: { nama: string; ukuran?: number; tone?: AvatarTone }) {
  const theme = useTheme();
  const warna = {
    primary: { bg: theme.primarySoft, fg: theme.primary },
    warning: { bg: theme.warningSoft, fg: theme.warning },
    info: { bg: theme.infoSoft, fg: theme.info },
    violet: { bg: theme.violetSoft, fg: theme.violet },
    danger: { bg: theme.dangerSoft, fg: theme.danger },
  }[tone];
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.avatar, { width: ukuran, height: ukuran, borderRadius: ukuran / 2, backgroundColor: warna.bg }]}>
      <ThemedText selectable={false} maxFontSizeMultiplier={1} style={[styles.teks, { color: warna.fg, fontSize: Math.round(ukuran * 0.36) }]}>
        {inisialNama(nama)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  teks: { fontWeight: '800' },
});
