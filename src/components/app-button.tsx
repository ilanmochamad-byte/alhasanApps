import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppIcon, type IconName } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { Elevation, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** `outline` = garis merah (tindakan berisiko); `line` = garis hijau (tindakan sekunder). */
type Variant = 'primary' | 'secondary' | 'danger' | 'outline' | 'line';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  /** Ikon opsional di kiri label. */
  icon?: IconName;
  /** `md` = 52 (baku, gelombang 2), `sm` = 44 untuk tombol sekunder yang berdampingan. */
  size?: 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
  /** Penjelasan tambahan bagi pembaca layar (mis. jangkauan tindakan). */
  accessibilityHint?: string;
};

export function AppButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  icon,
  size = 'md',
  style,
  accessibilityHint,
}: Props) {
  const theme = useTheme();

  const background =
    variant === 'primary'
      ? theme.primary
      : variant === 'danger'
        ? theme.danger
        : variant === 'outline' || variant === 'line'
          ? theme.card
          : theme.backgroundElement;
  const foreground =
    variant === 'secondary' ? theme.text : variant === 'outline' ? theme.danger : variant === 'line' ? theme.primary : theme.onPrimary;
  const borderColor = variant === 'outline' ? theme.danger : variant === 'line' ? theme.primary : 'transparent';
  const busy = Boolean(disabled || loading);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: busy, busy: Boolean(loading) }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        size === 'sm' && styles.buttonSm,
        variant === 'primary' && !busy && { boxShadow: Elevation.brand },
        {
          backgroundColor: pressed && variant === 'primary' ? theme.primaryPressed : background,
          borderWidth: variant === 'outline' || variant === 'line' ? 1.5 : 0,
          borderColor,
          opacity: busy ? 0.55 : pressed ? 0.9 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <View style={styles.content}>
          {icon ? <AppIcon name={icon} size={18} color={foreground} /> : null}
          <ThemedText type="bodyBold" style={[styles.label, { color: foreground }]}>
            {label}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: Radius.pill,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonSm: { minHeight: 44, paddingHorizontal: 14 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  label: { fontWeight: '800', textAlign: 'center' },
});
