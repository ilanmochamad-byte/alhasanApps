import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { actionableError, api } from '@/api/client';
import type { ReportMeetingDetail } from '@/api/types';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export default function ReportMeetingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const [meeting, setMeeting] = useState<ReportMeetingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try { setMeeting(await api.reportMeeting(Number(id))); }
    catch (caught) { setError(actionableError(caught)); }
  }, [id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: meeting ? `Pertemuan ${meeting.date}` : 'Detail Pertemuan' }} />
      {!meeting && !error ? <LoadingState label="Memuat detail pertemuan…" /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : meeting ? <>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}><ThemedText selectable style={styles.title}>{meeting.task.subject} · {meeting.task.class.name}</ThemedText><ThemedText selectable>{meeting.date} · {meeting.task.day}, {meeting.task.start_time}–{meeting.task.end_time}</ThemedText><ThemedText selectable themeColor="textSecondary">{meeting.task.book} · {meeting.task.place}</ThemedText><ThemedText selectable themeColor="textSecondary">Guru: {meeting.task.teacher.name}</ThemedText></View>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}><ThemedText selectable style={styles.title}>Kehadiran guru</ThemedText>{meeting.teacher_attendance ? <><ThemedText selectable style={{ color: theme.primary, fontWeight: '900' }}>{meeting.teacher_attendance.status}</ThemedText><ThemedText selectable>{meeting.teacher_attendance.notes || 'Tanpa catatan'}</ThemedText><ThemedText selectable type="small" themeColor="textSecondary">Pencatat: {meeting.teacher_attendance.recorded_by ?? '-'} · diperbarui {meeting.teacher_attendance.updated_at}</ThemedText></> : <ThemedText selectable themeColor="textSecondary">Belum dicatat.</ThemedText>}</View>
        <ThemedText selectable style={styles.sectionTitle}>Peserta ({meeting.student_summary.recorded_count}/{meeting.student_summary.participant_count})</ThemedText>
        {meeting.students.map((student) => <View key={student.student_id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}><View style={styles.heading}><View style={{ flex: 1 }}><ThemedText selectable style={styles.name}>{student.name}</ThemedText><ThemedText selectable type="small" themeColor="textSecondary">NIS {student.nis}</ThemedText></View><ThemedText selectable style={{ color: student.status ? theme.primary : theme.textSecondary, fontWeight: '800' }}>{student.status ?? 'Belum dicatat'}</ThemedText></View><ThemedText selectable>{student.notes || 'Tanpa catatan'}</ThemedText><ThemedText selectable type="small" themeColor="textSecondary">Pencatat: {student.recorded_by ?? '-'} · diperbarui {student.updated_at ?? '-'}</ThemedText></View>)}
      </> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 48, gap: 12, maxWidth: 760, width: '100%', alignSelf: 'center' },
  card: { borderWidth: 1, borderRadius: 18, borderCurve: 'continuous', padding: 16, gap: 8 },
  title: { fontSize: 19, fontWeight: '900' },
  sectionTitle: { fontSize: 20, fontWeight: '900', paddingTop: 8 },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  name: { fontSize: 16, fontWeight: '800' },
});
