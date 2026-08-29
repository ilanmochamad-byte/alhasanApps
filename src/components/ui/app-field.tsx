import type { ReactNode } from 'react';
import { StyleSheet, View, type TextInputProps } from 'react-native';

import { AppIcon, type IconName } from '@/components/app-icon';
import { KeyboardAwareTextInput } from '@/components/keyboard-aware-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Kolom teks berlabel. */
export function Field({
  label,
  hint,
  icon,
  trailing,
  multiline,
  style,
  ...input
}: TextInputProps & {
  label?: string;
  /** Teks kecil di kanan label (mis. "Opsional" atau hitungan karakter). */
  hint?: string;
  icon?: IconName;
  trailing?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      {label ? (
        <View style={styles.labelRow}>
          <ThemedText selectable type="label" style={styles.labelText}>
            {label}
          </ThemedText>
          {hint ? (
            <ThemedText selectable type="caption" themeColor="textMuted">
              {hint}
            </ThemedText>
          ) : null}
        </View>
      ) : null}
      <View
        style={[
          styles.box,
          multiline && styles.boxMultiline,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}>
        {icon ? <AppIcon name={icon} size={18} themeColor="textMuted" /> : null}
        <KeyboardAwareTextInput
          multiline={multiline}
          placeholderTextColor={theme.textMuted}
          style={[styles.input, multiline && styles.inputMultiline, { color: theme.text }, style]}
          {...input}
        />
        {trailing}
      </View>
    </View>
  );
}

/** Kolom cari satu baris. Terapkan pencarian lewat `onSubmitEditing`. */
export function SearchField(props: TextInputProps & { label?: string; hint?: string; trailing?: ReactNode }) {
  return <Field icon="search" returnKeyType="search" {...props} />;
}

const styles = StyleSheet.create({
  field: { gap: 7 },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  labelText: { flex: 1 },
  box: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  boxMultiline: { minHeight: 86, alignItems: 'flex-start', paddingVertical: 12 },
  input: { flex: 1, fontSize: 15, fontWeight: '500' },
  inputMultiline: { minHeight: 62, textAlignVertical: 'top' },
});
