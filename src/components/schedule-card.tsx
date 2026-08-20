import { Pressable, StyleSheet, View } from 'react-native';

import type { ScheduleOccurrence } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export function ScheduleCard({ schedule, onPress }: { schedule: ScheduleOccurrence; onPress: () => void }) {
  const theme = useTheme();
  const meetingLabel = schedule.meeting ? schedule.meeting.status : 'Belum dibuka';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${schedule.subject}, ${schedule.class.name}, ${schedule.start_time}`} onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.76 : 1 }]}>
      <View style={styles.row}><ThemedText selectable style={styles.subject}>{schedule.subject}</ThemedText><View style={[styles.badge, { backgroundColor: theme.backgroundSelected }]}><ThemedText selectable type="smallBold" themeColor="primary">{meetingLabel}</ThemedText></View></View>
      <ThemedText selectable>{formatDate(schedule.occurrence_date)} · {schedule.start_time}–{schedule.end_time}</ThemedText>
      <ThemedText selectable themeColor="textSecondary">{schedule.class.name} · {schedule.place}</ThemedText>
      <ThemedText selectable type="small" themeColor="textSecondary">Kitab: {schedule.book}</ThemedText>
    </Pressable>
  );
}

export function formatDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(parsed);
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, borderCurve: 'continuous', padding: 16, gap: 6, boxShadow: '0 2px 10px rgba(18, 42, 25, 0.06)' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  subject: { fontSize: 18, lineHeight: 24, fontWeight: '800', flex: 1 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
});
