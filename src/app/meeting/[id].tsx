import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { actionableError, api, createIdempotencyKey } from '@/api/client';
import type { AttendancePayload, AttendanceStatus, MeetingDetail } from '@/api/types';
import { AppButton } from '@/components/app-button';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import { formatDate } from '@/components/schedule-card';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { StatusSelector } from '@/components/status-selector';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type StudentDraft = Record<number, { status: AttendanceStatus; notes: string }>;

export default function MeetingScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const meetingId = Number(params.id);
  const theme = useTheme();
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [teacherStatus, setTeacherStatus] = useState<AttendanceStatus>('Hadir');
  const [teacherNotes, setTeacherNotes] = useState('');
  const [students, setStudents] = useState<StudentDraft>({});
  const [correctionReason, setCorrectionReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const attempt = useRef<{ signature: string; key: string } | null>(null);

  const applyMeeting = useCallback((value: MeetingDetail) => {
    setMeeting(value);
    setTeacherStatus(value.teacher_attendance?.status ?? 'Hadir');
    setTeacherNotes(value.teacher_attendance?.notes ?? '');
    setStudents(Object.fromEntries(value.students.map((student) => [student.student_id, { status: student.attendance?.status ?? 'Hadir', notes: student.attendance?.notes ?? '' }])));
  }, []);

  const load = useCallback(async () => {
    if (!Number.isInteger(meetingId) || meetingId < 1) { setError('ID pertemuan tidak valid.'); setLoading(false); return; }
    setLoading(true); setError(null);
    try { applyMeeting(await api.meeting(meetingId)); } catch (caught) { setError(actionableError(caught)); }
    finally { setLoading(false); }
  }, [applyMeeting, meetingId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const counts = useMemo(() => {
    const result: Record<AttendanceStatus, number> = { Hadir: 0, Terlambat: 0, Izin: 0, Sakit: 0, Alpa: 0 };
    Object.values(students).forEach((student) => { result[student.status] += 1; });
    return result;
  }, [students]);

  function updateStudent(id: number, patch: Partial<StudentDraft[number]>) {
    setStudents((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
    setSuccess(null);
  }

  function markAllPresent() {
    setStudents((current) => Object.fromEntries(Object.entries(current).map(([id, value]) => [id, { ...value, status: 'Hadir' }] as const)));
    setSuccess(null);
  }

  function buildPayload(): Omit<AttendancePayload, 'idempotency_key'> | null {
    if (!meeting) return null;
    return {
      teacher: { status: teacherStatus, notes: teacherNotes.trim() },
      students: meeting.students.map((student) => ({ student_id: student.student_id, status: students[student.student_id]?.status ?? 'Hadir', notes: students[student.student_id]?.notes.trim() ?? '' })),
      correction_reason: meeting.status === 'Selesai' ? correctionReason.trim() : null,
    };
  }

  async function submit() {
    const body = buildPayload();
    if (!meeting || !body) return;
    setSuccess(null);
    if (meeting.status === 'Selesai' && !body.correction_reason) { setError('Alasan koreksi wajib diisi karena pertemuan sudah selesai.'); return; }
    const signature = JSON.stringify(body);
    if (!attempt.current || attempt.current.signature !== signature) attempt.current = { signature, key: createIdempotencyKey('attendance') };
    setSubmitting(true); setError(null);
    try {
      const saved = await api.saveAttendance(meetingId, { ...body, idempotency_key: attempt.current.key });
      applyMeeting(saved); setCorrectionReason(''); setSuccess('Absensi berhasil disimpan dan dapat dibuka kembali.'); attempt.current = null;
    } catch (caught) { setError(actionableError(caught)); }
    finally { setSubmitting(false); }
  }

  function confirmSubmit() {
    const message = `Guru: ${teacherStatus}. Santri hadir: ${counts.Hadir} dari ${meeting?.students.length ?? 0}.`;
    if (process.env.EXPO_OS === 'web') {
      if (globalThis.confirm(`${meeting?.status === 'Selesai' ? 'Simpan koreksi?' : 'Kirim absensi?'}\n\n${message}`)) void submit();
      return;
    }
    Alert.alert(meeting?.status === 'Selesai' ? 'Simpan koreksi?' : 'Kirim absensi?', message, [
      { text: 'Periksa lagi', style: 'cancel' },
      { text: 'Simpan', onPress: () => void submit() },
    ]);
  }

  if (loading && !meeting) return <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: theme.background }}><LoadingState label="Memuat absensi…" /></ScrollView>;
  if (error && !meeting) return <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: theme.background }}><ErrorState message={error} onRetry={() => void load()} /></ScrollView>;

  return (
    <KeyboardAwareScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      {meeting ? <>
        <View style={[styles.hero, { backgroundColor: theme.primary }]}><ThemedText selectable style={[styles.subject, { color: theme.onPrimary }]}>{meeting.task.subject}</ThemedText><ThemedText selectable style={{ color: theme.onPrimary }}>{formatDate(meeting.date)} · {meeting.task.start_time}–{meeting.task.end_time}</ThemedText><ThemedText selectable style={{ color: theme.onPrimary }}>{meeting.task.class.name} · {meeting.task.place}</ThemedText></View>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}><View style={styles.row}><ThemedText selectable style={styles.heading}>Kehadiran guru</ThemedText><ThemedText selectable type="smallBold" themeColor={meeting.status === 'Selesai' ? 'success' : 'warning'}>{meeting.status}</ThemedText></View><StatusSelector value={teacherStatus} onChange={(value) => { setTeacherStatus(value); setSuccess(null); }} /><TextInput multiline value={teacherNotes} onChangeText={(value) => { setTeacherNotes(value); setSuccess(null); }} placeholder="Catatan guru (opsional)" placeholderTextColor={theme.textSecondary} style={[styles.notes, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]} /></View>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}><View style={styles.row}><View><ThemedText selectable style={styles.heading}>Kehadiran santri</ThemedText><ThemedText selectable themeColor="textSecondary">{meeting.students.length} peserta snapshot</ThemedText></View><View style={styles.allButton}><AppButton label="Semua hadir" onPress={markAllPresent} variant="secondary" /></View></View></View>
        {meeting.students.map((student, index) => { const draft = students[student.student_id] ?? { status: 'Hadir' as const, notes: '' }; return <View key={student.student_id} style={[styles.studentCard, { backgroundColor: theme.card, borderColor: theme.border }]}><View style={styles.studentTitle}><ThemedText selectable style={styles.number}>{index + 1}</ThemedText><View style={{ flex: 1 }}><ThemedText selectable style={{ fontWeight: '800' }}>{student.name}</ThemedText><ThemedText selectable type="small" themeColor="textSecondary">NIS {student.nis}</ThemedText></View></View><StatusSelector value={draft.status} onChange={(status) => updateStudent(student.student_id, { status })} /><TextInput value={draft.notes} onChangeText={(notes) => updateStudent(student.student_id, { notes })} placeholder="Catatan santri (opsional)" placeholderTextColor={theme.textSecondary} style={[styles.smallInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]} /></View>; })}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}><ThemedText selectable style={styles.heading}>Ringkasan</ThemedText><View style={styles.summary}>{Object.entries(counts).map(([status, count]) => <View key={status} style={[styles.summaryItem, { backgroundColor: theme.backgroundElement }]}><ThemedText selectable type="smallBold">{status}</ThemedText><ThemedText selectable style={styles.count}>{count}</ThemedText></View>)}</View>{meeting.status === 'Selesai' ? <View style={{ gap: 7 }}><ThemedText selectable type="smallBold">Alasan koreksi</ThemedText><TextInput multiline value={correctionReason} onChangeText={setCorrectionReason} placeholder="Wajib diisi untuk menyimpan koreksi" placeholderTextColor={theme.textSecondary} style={[styles.notes, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]} /></View> : null}{error ? <ThemedText selectable themeColor="danger" accessibilityLiveRegion="assertive">{error}</ThemedText> : null}{success ? <ThemedText selectable themeColor="success" accessibilityLiveRegion="polite">{success}</ThemedText> : null}<AppButton label={meeting.status === 'Selesai' ? 'Simpan koreksi' : 'Konfirmasi dan kirim'} onPress={confirmSubmit} loading={submitting} disabled={meeting.students.some((student) => !students[student.student_id])} /></View>
      </> : null}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 60, gap: 14, maxWidth: 760, width: '100%', alignSelf: 'center' },
  hero: { borderRadius: 22, borderCurve: 'continuous', padding: 20, gap: 6 },
  subject: { fontSize: 24, lineHeight: 30, fontWeight: '900' },
  card: { borderWidth: 1, borderRadius: 18, borderCurve: 'continuous', padding: 16, gap: 14 },
  studentCard: { borderWidth: 1, borderRadius: 17, borderCurve: 'continuous', padding: 15, gap: 12 },
  heading: { fontSize: 18, fontWeight: '900' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  allButton: { minWidth: 130 },
  notes: { minHeight: 78, borderWidth: 1, borderRadius: 12, padding: 12, textAlignVertical: 'top' },
  smallInput: { minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
  studentTitle: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  number: { width: 28, height: 28, textAlign: 'center', lineHeight: 28, borderRadius: 14, overflow: 'hidden', fontWeight: '900' },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryItem: { minWidth: 94, flex: 1, padding: 10, borderRadius: 12, borderCurve: 'continuous', gap: 3 },
  count: { fontSize: 21, fontWeight: '900', fontVariant: ['tabular-nums'] },
});
