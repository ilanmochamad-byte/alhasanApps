import { StyleSheet, View } from 'react-native';

import type { ScheduleOccurrence } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/chip';
import { Card } from '@/components/ui/surface';
import { useTheme } from '@/hooks/use-theme';

/** Nada lencana mengikuti status pertemuan, bukan warna tunggal seperti V1. */
function meetingTone(status: string | undefined) {
  if (status === 'Selesai') return 'primary' as const;
  if (status === 'Dibuka') return 'primary' as const;
  if (status === 'Draf') return 'warning' as const;
  return 'neutral' as const;
}

export function ScheduleCard({
  schedule,
  onPress,
  /** Sembunyikan tanggal bila kartu sudah berada di bawah judul tanggal. */
  hideDate,
}: {
  schedule: ScheduleOccurrence;
  onPress: () => void;
  hideDate?: boolean;
}) {
  const theme = useTheme();
  const meetingLabel = schedule.meeting ? schedule.meeting.status : 'Belum dibuka';
  const aktif = Boolean(schedule.meeting);

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${schedule.subject}, ${schedule.class.name}, ${schedule.start_time}`}
      style={styles.card}>
      <View style={styles.time}>
        <ThemedText selectable style={styles.timeStart}>
          {schedule.start_time}
        </ThemedText>
        <ThemedText selectable style={[styles.timeEnd, { color: theme.textMuted }]}>
          {schedule.end_time}
        </ThemedText>
      </View>
      <View style={[styles.rail, { backgroundColor: aktif ? theme.primary : theme.backgroundSelected }]} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <ThemedText selectable type="h3" style={styles.title}>
            {schedule.subject} · {schedule.class.name}
          </ThemedText>
          <Badge label={meetingLabel} tone={meetingTone(schedule.meeting?.status)} />
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
  card: { flexDirection: 'row', gap: 13, alignItems: 'stretch' },
  time: { width: 52, gap: 2 },
  timeStart: { fontSize: 15, lineHeight: 19, fontWeight: '800', fontVariant: ['tabular-nums'] },
  timeEnd: { fontSize: 12, lineHeight: 15, fontWeight: '500', fontVariant: ['tabular-nums'] },
  rail: { width: 2, borderRadius: 2 },
  body: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { flex: 1 },
});
