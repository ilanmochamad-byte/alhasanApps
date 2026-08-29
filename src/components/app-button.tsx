import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { AppIcon, type IconName } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { Elevation, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'outline';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  /** Ikon opsional di kiri label. */
  icon?: IconName;
  /** `md` = 48 (baku), `sm` = 40 untuk tombol sekunder yang berdampingan. */
  size?: 'md' | 'sm';
  style?: ViewStyle;
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
}: Props) {
  const theme = useTheme();

  const background =
    variant === 'primary'
      ? theme.primary
      : variant === 'danger'
        ? theme.danger
        : variant === 'outline'
          ? theme.card
          : theme.backgroundElement;
  const foreground =
    variant === 'secondary' ? theme.text : variant === 'outline' ? theme.danger : theme.onPrimary;
  const borderColor = variant === 'outline' ? theme.danger : 'transparent';
  const busy = Boolean(disabled || loading);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: busy, busy: Boolean(loading) }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        size === 'sm' && styles.buttonSm,
        variant === 'primary' && !busy && { boxShadow: Elevation.brand },
        {
          backgroundColor: pressed && variant === 'primary' ? theme.primaryPressed : background,
          borderWidth: variant === 'outline' ? 1.5 : 0,
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
    minHeight: 48,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonSm: { minHeight: 44, paddingHorizontal: 14 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  label: { fontWeight: '800', textAlign: 'center' },
});
