import { View, StyleSheet } from 'react-native';

import type { IzinCapability } from '@/api/types';
import { Chip } from '@/components/ui/chip';

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
  if (modes.length < 2) return null;

  return (
    <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel="Pilih cakupan peran">
      {modes.map((mode) => (
        <Chip
          key={mode}
          accessibilityRole="radio"
          label={MODE_LABEL[mode]}
          selected={mode === value}
          disabled={disabled}
          onPress={() => onChange(mode)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
