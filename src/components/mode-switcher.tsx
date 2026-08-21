import { Pressable, StyleSheet, View } from 'react-native';

import type { IzinCapability } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export const MODE_LABEL: Record<IzinCapability, string> = {
  admin: 'Admin',
  pengurus: 'Pengurus',
  murobi: 'Murobi',
  orang_tua: 'Orang Tua',
};

/**
 * Pemilih cakupan untuk akun dengan lebih dari satu kemampuan (PRD 5.6:
 * satu sesi, berpindah menu tanpa login ulang).
 *
 * Daftar mode berasal dari capability yang dikirim server. Memilih mode di sini
 * hanya MEMPERSEMPIT permintaan; server tetap menolak mode yang tidak dimiliki.
 */
export function ModeSwitcher({
  modes,
  value,
  onChange,
  disabled,
}: {
  modes: IzinCapability[];
  value: IzinCapability | null;
  onChange: (mode: IzinCapability) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  if (modes.length < 2) return null;

  return (
    <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel="Pilih cakupan peran">
      {modes.map((mode) => {
        const selected = mode === value;
        return (
          <Pressable
            key={mode}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled: Boolean(disabled) }}
            disabled={disabled}
            onPress={() => onChange(mode)}
            style={({ pressed }) => [
              styles.option,
              {
                backgroundColor: selected ? theme.primary : theme.backgroundElement,
                borderColor: selected ? theme.primary : theme.border,
                opacity: disabled ? 0.55 : pressed ? 0.75 : 1,
              },
            ]}>
            <ThemedText selectable type="smallBold" style={{ color: selected ? theme.onPrimary : theme.text }}>
              {MODE_LABEL[mode]}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  option: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
});
