import { StyleSheet, View } from 'react-native';

import { AppIcon, type IconName } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'violet' | 'neutral';

const IKON_BAWAAN: Record<StatusTone, IconName> = {
  success: 'check',
  warning: 'clock',
  danger: 'close',
  info: 'info',
  violet: 'info',
  neutral: 'info',
};

/**
 * Pil status lunak: SELALU ikon + teks, tidak pernah warna saja. Warna dari
 * token status yang ada; nada dipilih pemanggil dari status server.
 */
export function StatusPill({ label, tone = 'neutral', icon }: { label: string; tone?: StatusTone; icon?: IconName }) {
  const theme = useTheme();
  const warna = {
    success: { bg: theme.primarySoft, border: theme.primaryBorder, fg: theme.primary },
    warning: { bg: theme.warningSoft, border: theme.warningBorder, fg: theme.warning },
    danger: { bg: theme.dangerSoft, border: theme.dangerBorder, fg: theme.danger },
    info: { bg: theme.infoSoft, border: theme.infoSoft, fg: theme.info },
    violet: { bg: theme.violetSoft, border: theme.violetSoft, fg: theme.violet },
    neutral: { bg: theme.backgroundElement, border: theme.border, fg: theme.textSecondary },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: warna.bg, borderColor: warna.border }]}>
      <AppIcon name={icon ?? IKON_BAWAAN[tone]} size={14} color={warna.fg} />
      <ThemedText selectable type="labelSmall" style={[styles.teks, { color: warna.fg }]}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  teks: { flexShrink: 1, fontWeight: '700' },
});
