import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppIcon, type IconName } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type NoticeTone = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

const IKON: Record<NoticeTone, IconName> = {
  success: 'check-circle',
  danger: 'close',
  warning: 'clock',
  info: 'info',
  neutral: 'info',
};

/**
 * Kotak pemberitahuan dalam alur (hasil simpan, galat, keterangan): ikon +
 * teks di atas latar lunak. Status tidak pernah dibawa warna saja.
 */
export function Notice({
  text,
  tone = 'neutral',
  icon,
  title,
  selectable = true,
  children,
}: {
  text?: string | null;
  tone?: NoticeTone;
  icon?: IconName;
  title?: string;
  /** Matikan untuk teks pribadi (alasan izin) agar tidak tersalin tak sengaja. */
  selectable?: boolean;
  children?: ReactNode;
}) {
  const theme = useTheme();
  if (!text && !children) return null;
  const warna = {
    success: { bg: theme.primarySoft, border: theme.primaryBorder, fg: theme.success },
    danger: { bg: theme.dangerSoft, border: theme.dangerBorder, fg: theme.danger },
    warning: { bg: theme.warningSoft, border: theme.warningBorder, fg: theme.warning },
    info: { bg: theme.infoSoft, border: theme.infoSoft, fg: theme.info },
    neutral: { bg: theme.backgroundElement, border: theme.border, fg: theme.textSecondary },
  }[tone];
  return (
    <View
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      accessibilityLiveRegion={tone === 'danger' ? 'assertive' : 'polite'}
      style={[styles.kotak, { backgroundColor: warna.bg, borderColor: warna.border }]}>
      <AppIcon name={icon ?? IKON[tone]} size={18} color={warna.fg} />
      <View style={styles.isi}>
        {title ? (
          <ThemedText selectable={selectable} type="label" style={{ color: warna.fg }}>
            {title}
          </ThemedText>
        ) : null}
        {text ? (
          <ThemedText selectable={selectable} type="labelSmall" style={{ color: tone === 'neutral' ? theme.textSecondary : warna.fg }}>
            {text}
          </ThemedText>
        ) : null}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kotak: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    padding: 12,
  },
  isi: { flex: 1, gap: 4 },
});
