import { StyleSheet, View } from 'react-native';

import type { ScheduleOccurrence } from '@/api/types';
import { AppIcon } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/surface';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isoHariIni } from '@/lib/date';
import { statusSesi } from '@/lib/schedule-status';

/**
 * Kartu sesi (redesain tampilan Fase 2, gabungan Konsep B + C): jam di kiri,
 * judul, status absensi berupa ikon + teks, dan penanda "Absen" untuk sesi
 * hari ini yang belum selesai. Seluruh kartu adalah satu tombol menuju detail
 * tugas; penanda "Absen" hanya petunjuk visual, bukan tombol kedua.
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
  const status = statusSesi(schedule.meeting, schedule.occurrence_date, today);
  const warnaStatus =
    status.nada === 'selesai' ? theme.primary : status.nada === 'menunggu' ? theme.warning : theme.textSecondary;

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={[
        `${schedule.subject}, ${schedule.class.name}`,
        `${schedule.start_time} sampai ${schedule.end_time}`,
        status.label,
        status.perluAbsen ? 'ketuk untuk absen' : null,
      ]
        .filter(Boolean)
        .join(', ')}
      style={[styles.card, status.perluAbsen && { borderColor: theme.primary, borderWidth: 2 }]}>
      <View style={styles.time}>
        <ThemedText selectable style={styles.timeStart}>
          {schedule.start_time}
        </ThemedText>
        <ThemedText selectable style={[styles.timeEnd, { color: theme.textSecondary }]}>
          {schedule.end_time}
        </ThemedText>
      </View>
      <View style={styles.body}>
        <ThemedText selectable type="h3" style={styles.title}>
          {schedule.subject} · {schedule.class.name}
        </ThemedText>
        <View style={styles.statusRow}>
          {status.ikon ? <AppIcon name={status.ikon} size={15} color={warnaStatus} /> : null}
          <ThemedText selectable style={[styles.statusText, { color: warnaStatus }]}>
            {status.label}
          </ThemedText>
        </View>
        {hideDate ? null : (
          <ThemedText selectable type="caption" themeColor="textSecondary">
            {formatDate(schedule.occurrence_date)}
          </ThemedText>
        )}
        <ThemedText selectable type="caption" themeColor="textSecondary">
          {schedule.place} · {schedule.book}
        </ThemedText>
      </View>
      {status.perluAbsen ? (
        <View style={[styles.absen, { backgroundColor: theme.primary }]}>
          <ThemedText style={[styles.absenText, { color: theme.onPrimary }]}>Absen</ThemedText>
        </View>
      ) : (
        <AppIcon name="chevron-right" size={18} themeColor="textMuted" />
      )}
    </Card>
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
  card: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  time: { minWidth: 52, alignItems: 'center', gap: 2 },
  timeStart: { fontSize: 17, lineHeight: 21, fontWeight: '800', fontVariant: ['tabular-nums'] },
  timeEnd: { fontSize: 12, lineHeight: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  body: { flex: 1, gap: 3 },
  title: { fontSize: 16, lineHeight: 21 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusText: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  absen: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  absenText: { fontSize: 14, lineHeight: 18, fontWeight: '800' },
});
