import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type TextInputProps } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { KeyboardAwareTextInput } from '@/components/keyboard-aware-scroll-view';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Radius, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Kolom cari membulat + tombol penyaring kotak. Tombol penyaring membuka
 * lembar bawah berisi `filter` (tanggal, status, unit); tanpa `filter` tombol
 * tidak digambar. `filterActive` menandai ada saringan yang sedang berlaku.
 */
export function SearchBar({
  filter,
  filterTitle = 'Saring',
  filterActive,
  trailing,
  accessibilityLabel = 'Cari',
  ...input
}: TextInputProps & {
  filter?: ReactNode | ((tutup: () => void) => ReactNode);
  filterTitle?: string;
  filterActive?: boolean;
  /** Isi di kanan dalam kolom (mis. tombol "Terapkan" atau hapus). */
  trailing?: ReactNode;
}) {
  const theme = useTheme();
  const [terbuka, setTerbuka] = useState(false);
  const tutup = () => setTerbuka(false);
  return (
    <View style={styles.baris}>
      <View style={[styles.kolom, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <AppIcon name="search" size={18} themeColor="textMuted" />
        <KeyboardAwareTextInput
          accessibilityLabel={accessibilityLabel}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.text }]}
          {...input}
        />
        {trailing}
      </View>
      {filter ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={filterActive ? `${filterTitle}, ada saringan aktif` : filterTitle}
          onPress={() => setTerbuka(true)}
          style={({ pressed }) => [
            styles.saring,
            {
              backgroundColor: filterActive ? theme.primary : theme.card,
              borderColor: filterActive ? theme.primary : theme.border,
              opacity: pressed ? 0.75 : 1,
            },
          ]}>
          <AppIcon name="filter" size={20} color={filterActive ? theme.onPrimary : theme.text} />
        </Pressable>
      ) : null}
      {filter ? (
        <BottomSheet visible={terbuka} title={filterTitle} onClose={tutup}>
          {typeof filter === 'function' ? filter(tutup) : filter}
        </BottomSheet>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  baris: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kolom: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 16,
  },
  input: { flex: 1, fontSize: 15, fontWeight: '500', minHeight: TouchTarget },
  saring: {
    width: 52,
    height: 52,
    borderWidth: 1,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
