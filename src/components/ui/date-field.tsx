import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';

import { AppIcon } from '@/components/app-icon';
import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { Field } from '@/components/ui/app-field';
import { Radius } from '@/constants/theme';
import { isoDate, parseIsoDate, formatSedang } from '@/lib/date';
import { useTheme } from '@/hooks/use-theme';

/**
 * Kolom tanggal dengan pemilih kalender bawaan sistem.
 *
 * Menggantikan kolom ketik `YYYY-MM-DD` yang menuntut pengguna menghafal
 * format. Nilai yang dipegang komponen ini TETAP string `YYYY-MM-DD` dan
 * disusun dari komponen tanggal lokal (lihat `lib/date`), sehingga muatan yang
 * dikirim ke setiap endpoint sama persis seperti sebelumnya — tidak ada
 * perubahan di sisi API maupun basis data.
 *
 * Pemilihnya berasal dari `@expo/ui`, yang sudah menjadi dependensi proyek:
 * SwiftUI DatePicker di iOS dan Jetpack Compose DatePicker di Android. Di web,
 * yang tidak punya pemilih native, kolom ketik lama tetap dipakai.
 */
export function DateField({
  label,
  value,
  onChange,
  placeholder = 'Pilih tanggal',
  minimumDate,
  maximumDate,
  disabled,
}: {
  label?: string;
  /** `YYYY-MM-DD`, atau string kosong bila belum dipilih. */
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** Batas bawah, juga dalam `YYYY-MM-DD`. */
  minimumDate?: string;
  maximumDate?: string;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const [terbuka, setTerbuka] = useState(false);
  const [draf, setDraf] = useState<Date | null>(null);

  // Web tidak punya pemilih native: pertahankan kolom ketik agar tidak ada
  // kemampuan yang hilang di sana.
  if (process.env.EXPO_OS === 'web') {
    return (
      <Field
        label={label}
        icon="calendar"
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        editable={!disabled}
      />
    );
  }

  const terpilih = parseIsoDate(value) ?? new Date();
  const min = minimumDate ? (parseIsoDate(minimumDate) ?? undefined) : undefined;
  const max = maximumDate ? (parseIsoDate(maximumDate) ?? undefined) : undefined;

  function buka() {
    if (disabled) return;
    setDraf(terpilih);
    setTerbuka(true);
  }

  function simpan(date: Date) {
    onChange(isoDate(date));
    setTerbuka(false);
  }

  return (
    <View style={styles.wrap}>
      {label ? (
        <ThemedText selectable type="label">
          {label}
        </ThemedText>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          value ? `${label ?? 'Tanggal'}: ${formatSedang(value)}. Ketuk untuk mengubah.` : `${label ?? 'Tanggal'}: ${placeholder}`
        }
        accessibilityState={{ disabled: Boolean(disabled) }}
        disabled={disabled}
        onPress={buka}
        style={({ pressed }) => [
          styles.box,
          {
            backgroundColor: theme.card,
            borderColor: terbuka ? theme.primary : theme.border,
            borderWidth: terbuka ? 1.5 : 1,
            opacity: disabled ? 0.55 : pressed ? 0.8 : 1,
          },
        ]}>
        <AppIcon name="calendar" size={18} themeColor={value ? 'primary' : 'textMuted'} />
        <ThemedText
          selectable={false}
          type="bodyBold"
          themeColor={value ? 'text' : 'textMuted'}
          style={styles.value}
          numberOfLines={1}>
          {value ? formatSedang(value) : placeholder}
        </ThemedText>
        <AppIcon name="chevron-down" size={16} themeColor="textMuted" />
      </Pressable>

      {/* Android menampilkan dialog Material begitu komponennya dipasang. */}
      {terbuka && Platform.OS === 'android' ? (
        <DateTimePicker
          mode="date"
          value={terpilih}
          minimumDate={min}
          maximumDate={max}
          presentation="dialog"
          positiveButton={{ label: 'Pilih' }}
          negativeButton={{ label: 'Batal' }}
          accentColor={theme.primary}
          onValueChange={(_event, date) => simpan(date)}
          onDismiss={() => setTerbuka(false)}
        />
      ) : null}

      {/* iOS selalu menyajikan pemilih secara inline, jadi ia dibungkus lembar
          sendiri agar tetap terasa seperti dialog. */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={terbuka}
          animationType="slide"
          transparent
          onRequestClose={() => setTerbuka(false)}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tutup pemilih tanggal"
            style={styles.backdrop}
            onPress={() => setTerbuka(false)}
          />
          <View
            style={[
              styles.sheet,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}>
            <View style={styles.handleRow}>
              <ThemedText selectable type="h3">
                {label ?? 'Pilih tanggal'}
              </ThemedText>
            </View>
            <DateTimePicker
              mode="date"
              display="inline"
              value={draf ?? terpilih}
              minimumDate={min}
              maximumDate={max}
              accentColor={theme.primary}
              locale="id_ID"
              themeVariant={theme.background === '#0D1711' ? 'dark' : 'light'}
              style={styles.picker}
              onValueChange={(_event, date) => setDraf(date)}
            />
            <View style={styles.sheetActions}>
              <AppButton
                label="Batal"
                variant="secondary"
                style={styles.sheetButton}
                onPress={() => setTerbuka(false)}
              />
              <AppButton
                label="Pilih tanggal"
                style={styles.sheetButtonWide}
                onPress={() => simpan(draf ?? terpilih)}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 7 },
  box: {
    minHeight: 48,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  value: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(9, 20, 13, 0.45)' },
  sheet: {
    borderTopWidth: 1,
    borderTopLeftRadius: Radius.hero,
    borderTopRightRadius: Radius.hero,
    borderCurve: 'continuous',
    padding: 16,
    paddingBottom: 34,
    gap: 12,
  },
  handleRow: { alignItems: 'center', paddingBottom: 2 },
  picker: { alignSelf: 'stretch', height: 380 },
  sheetActions: { flexDirection: 'row', gap: 10 },
  sheetButton: { flex: 1 },
  sheetButtonWide: { flex: 1.4 },
});
