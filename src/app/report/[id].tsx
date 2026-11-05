import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { actionableError, api } from '@/api/client';
import type { ReportMeetingDetail } from '@/api/types';
import { PesertaKosong, PesertaSaring } from '@/components/peserta-saring';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { daftarKelas, labelKelas, namaKelasAsal } from '@/lib/kelas-jadwal';
import { saringPeserta, tabKelas, TAB_SEMUA } from '@/lib/peserta-saring';

export default function ReportMeetingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const [meeting, setMeeting] = useState<ReportMeetingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kataKunci, setKataKunci] = useState('');
  const [tab, setTab] = useState<string>(TAB_SEMUA);

  const load = useCallback(async () => {
    setError(null);
    try { setMeeting(await api.reportMeeting(Number(id))); }
    catch (caught) { setError(actionableError(caught)); }
  }, [id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const kelas = meeting ? daftarKelas(meeting.task) : [];
  const gabungan = kelas.length > 1;
  const tabs = meeting && gabungan ? tabKelas(meeting.students, kelas) : null;
  const tabAktif = tabs?.some((item) => item.key === tab) ? tab : TAB_SEMUA;
  const kelompok = meeting ? saringPeserta(meeting.students, kelas, { tab: tabAktif, kataKunci }) : [];
  const tampil = kelompok.reduce((jumlah, grup) => jumlah + grup.items.length, 0);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: meeting ? `Pertemuan ${meeting.date}` : 'Detail Pertemuan' }} />
      {!meeting && !error ? <LoadingState label="Memuat detail pertemuan…" /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : meeting ? <>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}><ThemedText selectable style={styles.title}>{meeting.task.subject} · {labelKelas(meeting.task)}</ThemedText>{gabungan ? <ThemedText selectable themeColor="textSecondary">Kelas gabungan · {kelas.length} kelas dalam satu pertemuan</ThemedText> : null}<ThemedText selectable>{meeting.date} · {meeting.task.day}, {meeting.task.start_time}–{meeting.task.end_time}</ThemedText><ThemedText selectable themeColor="textSecondary">{meeting.task.book} · {meeting.task.place}</ThemedText><ThemedText selectable themeColor="textSecondary">Guru: {meeting.task.teacher.name}</ThemedText></View>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}><ThemedText selectable style={styles.title}>Kehadiran guru</ThemedText>{meeting.teacher_attendance ? <><ThemedText selectable style={{ color: theme.primary, fontWeight: '900' }}>{meeting.teacher_attendance.status}</ThemedText><ThemedText selectable>{meeting.teacher_attendance.notes || 'Tanpa catatan'}</ThemedText><ThemedText selectable type="small" themeColor="textSecondary">Pencatat: {meeting.teacher_attendance.recorded_by ?? '-'} · diperbarui {meeting.teacher_attendance.updated_at}</ThemedText></> : <ThemedText selectable themeColor="textSecondary">Belum dicatat.</ThemedText>}</View>
        <ThemedText selectable style={styles.sectionTitle}>Peserta ({meeting.student_summary.recorded_count}/{meeting.student_summary.participant_count})</ThemedText>
        {meeting.students.length > 0 ? <PesertaSaring kataKunci={kataKunci} onKataKunci={setKataKunci} tabs={tabs} tab={tabAktif} onTab={setTab} tampil={tampil} total={meeting.students.length} /> : null}
        {tampil === 0 && meeting.students.length > 0 ? <PesertaKosong onReset={() => { setKataKunci(''); setTab(TAB_SEMUA); }} /> : null}
        {kelompok.flatMap((grup) => [...(gabungan && grup.nama ? [<ThemedText key={`h-${grup.key}`} selectable type="label" accessibilityRole="header">{grup.nama} · {grup.items.length} santri</ThemedText>] : []), ...grup.items.map((student) => <View key={student.student_id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}><View style={styles.heading}><View style={{ flex: 1 }}><ThemedText selectable style={styles.name}>{student.name}</ThemedText><ThemedText selectable type="small" themeColor="textSecondary">NIS {student.nis}{gabungan && namaKelasAsal(student, kelas) ? ` · Kelas ${namaKelasAsal(student, kelas)}` : ''}</ThemedText></View><ThemedText selectable style={{ color: student.status ? theme.primary : theme.textSecondary, fontWeight: '800' }}>{student.status ?? 'Belum dicatat'}</ThemedText></View><ThemedText selectable>{student.notes || 'Tanpa catatan'}</ThemedText><ThemedText selectable type="small" themeColor="textSecondary">Pencatat: {student.recorded_by ?? '-'} · diperbarui {student.updated_at ?? '-'}</ThemedText></View>)])}
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
