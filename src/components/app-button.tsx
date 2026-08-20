import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
};

export function AppButton({ label, onPress, disabled, loading, variant = 'primary' }: Props) {
  const theme = useTheme();
  const backgroundColor = variant === 'primary' ? theme.primary : variant === 'danger' ? theme.danger : theme.backgroundElement;
  const color = variant === 'secondary' ? theme.text : theme.onPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor, opacity: disabled || loading ? 0.55 : pressed ? 0.78 : 1 }]}>
      {loading ? <ActivityIndicator color={color} /> : <ThemedText selectable style={[styles.label, { color }]}>{label}</ThemedText>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 48, borderRadius: 14, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 12 },
  label: { fontWeight: '700', textAlign: 'center' },
});
