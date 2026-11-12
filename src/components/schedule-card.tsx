import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import type { ScheduleOccurrence } from '@/api/types';
import { AppIcon } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { StatusPill, type StatusTone } from '@/components/ui/status-pill';
import { Elevation, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isoHariIni } from '@/lib/date';
import { labelKelas } from '@/lib/kelas-jadwal';
import { statusSesi, type NadaStatus } from '@/lib/schedule-status';

const NADA_PIL: Record<NadaStatus, StatusTone> = { selesai: 'success', menunggu: 'warning', netral: 'neutral' };

/**
 * Kartu sesi (redesain gelombang 2 §4.2): blok jam di kiri, kitab + seluruh
 * kelas (kelas gabungan ikut tampil), pil status ikon + teks, dan penanda
 * "Absen" untuk sesi hari ini yang belum selesai. Seluruh kartu satu tombol
 * menuju rincian tugas; penanda "Absen" hanya petunjuk visual.
 */
export function ScheduleCard({
  schedule,
  onPress,
  /** Sembunyikan tanggal bila kartu sudah berada di bawah judul tanggal. */
  hideDate,
  today = isoHariIni(),
}: {
  schedule: ScheduleOccurrence;
  onPress: () => void;
  hideDate?: boolean;
  today?: string;
}) {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  // Teks sistem sangat besar: jam, isi, dan penanda Absen ditumpuk agar
  // judul tidak terperas menjadi kolom sempit di antara jam dan penanda.
  const bertumpuk = fontScale > 1.35;
  const kelas = labelKelas(schedule);
  const status = statusSesi(schedule.meeting, schedule.occurrence_date, today);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      accessibilityLabel={[
        `${schedule.subject}, ${kelas}`,
        `${schedule.start_time} sampai ${schedule.end_time}`,
        status.label,
        status.perluAbsen ? 'ketuk untuk absen' : null,
      ]
        .filter(Boolean)
        .join(', ')}
      style={({ pressed }) => [
        styles.card,
        bertumpuk && styles.cardStacked,
        {
          backgroundColor: theme.card,
          borderColor: status.perluAbsen ? theme.primary : theme.border,
          borderWidth: status.perluAbsen ? 2 : 1,
          boxShadow: Elevation.card,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <View
        style={[
          styles.time,
          bertumpuk && styles.timeStacked,
          { backgroundColor: status.perluAbsen ? theme.primarySoft : theme.backgroundElement },
        ]}>
        <ThemedText selectable style={styles.timeStart}>
          {schedule.start_time}
        </ThemedText>
        <ThemedText selectable style={[styles.timeEnd, { color: theme.textSecondary }]}>
          {schedule.end_time}
        </ThemedText>
      </View>
      <View style={[styles.body, bertumpuk && styles.bodyStacked]}>
        <ThemedText selectable type="bodyBold" style={styles.title}>
          {schedule.subject} · {kelas}
        </ThemedText>
        {hideDate ? null : (
          <ThemedText selectable type="caption" themeColor="textSecondary">
            {formatDate(schedule.occurrence_date)}
          </ThemedText>
        )}
        <ThemedText selectable type="caption" themeColor="textSecondary">
          {schedule.place} · {schedule.book}
        </ThemedText>
        <View style={styles.pil}>
          <StatusPill label={status.label} tone={NADA_PIL[status.nada]} icon={status.ikon} />
        </View>
      </View>
      {status.perluAbsen ? (
        <View style={[styles.absen, { backgroundColor: theme.primary }]}>
          <ThemedText style={[styles.absenText, { color: theme.onPrimary }]}>Absen</ThemedText>
        </View>
      ) : bertumpuk ? null : (
        <AppIcon name="chevron-right" size={18} themeColor="textMuted" />
      )}
    </Pressable>
  );
}

export function formatDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(parsed);
}

/** Versi pendek untuk judul kelompok tanggal. */
export function formatDateShort(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(parsed);
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderRadius: Radius.xxl,
    borderCurve: 'continuous',
    padding: 12,
  },
  cardStacked: { flexDirection: 'column', alignItems: 'flex-start', gap: 8 },
  time: {
    minWidth: 64,
    alignItems: 'center',
    gap: 2,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  timeStacked: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  bodyStacked: { flex: 0, alignSelf: 'stretch' },
  timeStart: { fontSize: 17, lineHeight: 21, fontWeight: '800', fontVariant: ['tabular-nums'] },
  timeEnd: { fontSize: 12, lineHeight: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  body: { flex: 1, gap: 3 },
  title: { fontSize: 16, lineHeight: 21, fontWeight: '800' },
  pil: { paddingTop: 4 },
  absen: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  absenText: { fontSize: 14, lineHeight: 18, fontWeight: '800' },
});
