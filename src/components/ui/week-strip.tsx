import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconButton } from '@/components/ui/icon-button';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isoHariIni, parseIsoDate } from '@/lib/date';
import { geserPekan, hariPekan } from '@/lib/week';

const NAMA_HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Ahd'];

/**
 * Deretan tanggal satu pekan (redesain tampilan, dari Konsep B): judul bulan
 * dengan tombol pekan sebelumnya/berikutnya, lalu tujuh tanggal Senin–Minggu.
 * Tanggal terpilih diisi warna utama; hari ini yang tidak terpilih diberi
 * titik penanda. Nilai masuk dan keluar dalam format `YYYY-MM-DD`.
 */
export function WeekStrip({
  value,
  onChange,
  today = isoHariIni(),
}: {
  value: string;
  onChange: (iso: string) => void;
  today?: string;
}) {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  // Tujuh kolom sama lebar hanya muat sampai skala teks tertentu. Di atasnya
  // sel selebar isinya dan deretan dapat digeser ke samping, agar nama hari
  // dan tanggal tidak terpecah per huruf.
  const geser = fontScale > 1.35;
  const hari = hariPekan(value);
  const bulan = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
    parseIsoDate(value) ?? new Date(),
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <ThemedText selectable type="h2" style={styles.month}>
          {bulan}
        </ThemedText>
        <IconButton
          icon="chevron-left"
          accessibilityLabel="Pekan sebelumnya"
          onPress={() => onChange(geserPekan(value, -1))}
        />
        <IconButton
          icon="chevron-right"
          accessibilityLabel="Pekan berikutnya"
          onPress={() => onChange(geserPekan(value, 1))}
        />
      </View>
      <ScrollView
        horizontal
        scrollEnabled={geser}
        showsHorizontalScrollIndicator={geser}
        contentContainerStyle={[styles.days, !geser && styles.daysFill]}>
        {hari.map((iso, index) => {
          const dipilih = iso === value;
          const tanggal = Number(iso.slice(8));
          const panjang = new Intl.DateTimeFormat('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          }).format(parseIsoDate(iso) ?? new Date());
          return (
            <Pressable
              key={iso}
              accessibilityRole="button"
              accessibilityLabel={iso === today ? `${panjang}, hari ini` : panjang}
              accessibilityState={{ selected: dipilih }}
              onPress={() => onChange(iso)}
              style={({ pressed }) => [
                styles.day,
                geser ? styles.dayWide : styles.dayFill,
                {
                  backgroundColor: dipilih ? theme.primary : theme.card,
                  borderColor: dipilih ? theme.primary : theme.border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}>
              <ThemedText
                style={[styles.dayName, { color: dipilih ? theme.onPrimary : theme.textSecondary }]}>
                {NAMA_HARI[index]}
              </ThemedText>
              <ThemedText style={[styles.dayNumber, { color: dipilih ? theme.onPrimary : theme.text }]}>
                {tanggal}
              </ThemedText>
              <View
                style={[
                  styles.todayDot,
                  { backgroundColor: iso === today && !dipilih ? theme.primary : 'transparent' },
                ]}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  month: { flex: 1, textTransform: 'capitalize' },
  days: { flexDirection: 'row', gap: 6 },
  daysFill: { flexGrow: 1 },
  dayFill: { flex: 1 },
  dayWide: { paddingHorizontal: 12 },
  day: {
    minHeight: 66,
    borderWidth: 1,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 2,
  },
  dayName: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
  dayNumber: { fontSize: 17, lineHeight: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  todayDot: { width: 5, height: 5, borderRadius: Radius.pill },
});
