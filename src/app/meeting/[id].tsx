import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { actionableError, api, createIdempotencyKey } from '@/api/client';
import type { AttendancePayload, AttendanceStatus, MeetingDetail } from '@/api/types';
import { AppButton } from '@/components/app-button';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import { formatDate } from '@/components/schedule-card';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { StatusSelector } from '@/components/status-selector';
import { ThemedText } from '@/components/themed-text';
import { ActionBar } from '@/components/ui/action-bar';
import { Field } from '@/components/ui/app-field';
import { Badge } from '@/components/ui/chip';
import { StatusRecap } from '@/components/ui/status-recap';
import { Divider, Overline, Panel } from '@/components/ui/surface';
import { Radius } from '@/constants/theme';
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
    setStudents(
      Object.fromEntries(
        value.students.map((student) => [
          student.student_id,
          { status: student.attendance?.status ?? 'Hadir', notes: student.attendance?.notes ?? '' },
        ]),
      ),
    );
  }, []);

  const load = useCallback(async () => {
    if (!Number.isInteger(meetingId) || meetingId < 1) {
      setError('ID pertemuan tidak valid.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      applyMeeting(await api.meeting(meetingId));
    } catch (caught) {
      setError(actionableError(caught));
    } finally {
      setLoading(false);
    }
  }, [applyMeeting, meetingId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const counts = useMemo(() => {
    const result: Record<AttendanceStatus, number> = { Hadir: 0, Terlambat: 0, Izin: 0, Sakit: 0, Alpa: 0 };
    Object.values(students).forEach((student) => {
      result[student.status] += 1;
    });
    return result;
  }, [students]);

  // Berapa santri yang sudah punya catatan absensi tersimpan di server.
  const tercatat = useMemo(
    () => meeting?.students.filter((student) => student.attendance !== null).length ?? 0,
    [meeting],
  );

  function updateStudent(id: number, patch: Partial<StudentDraft[number]>) {
    setStudents((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
    setSuccess(null);
  }

  function markAllPresent() {
    setStudents((current) =>
      Object.fromEntries(
        Object.entries(current).map(([id, value]) => [id, { ...value, status: 'Hadir' }] as const),
      ),
    );
    setSuccess(null);
  }

  function buildPayload(): Omit<AttendancePayload, 'idempotency_key'> | null {
    if (!meeting) return null;
    return {
      teacher: { status: teacherStatus, notes: teacherNotes.trim() },
      students: meeting.students.map((student) => ({
        student_id: student.student_id,
        status: students[student.student_id]?.status ?? 'Hadir',
        notes: students[student.student_id]?.notes.trim() ?? '',
      })),
      correction_reason: meeting.status === 'Selesai' ? correctionReason.trim() : null,
    };
  }

  async function submit() {
    const body = buildPayload();
    if (!meeting || !body) return;
    setSuccess(null);
    if (meeting.status === 'Selesai' && !body.correction_reason) {
      setError('Alasan koreksi wajib diisi karena pertemuan sudah selesai.');
      return;
    }
    const signature = JSON.stringify(body);
    if (!attempt.current || attempt.current.signature !== signature) {
      attempt.current = { signature, key: createIdempotencyKey('attendance') };
    }
    setSubmitting(true);
    setError(null);
    try {
      const saved = await api.saveAttendance(meetingId, { ...body, idempotency_key: attempt.current.key });
      applyMeeting(saved);
      setCorrectionReason('');
      setSuccess('Absensi berhasil disimpan dan dapat dibuka kembali.');
      attempt.current = null;
    } catch (caught) {
      setError(actionableError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  function confirmSubmit() {
    const message = `Guru: ${teacherStatus}. Santri hadir: ${counts.Hadir} dari ${meeting?.students.length ?? 0}.`;
    if (process.env.EXPO_OS === 'web') {
      if (globalThis.confirm(`${meeting?.status === 'Selesai' ? 'Simpan koreksi?' : 'Kirim absensi?'}\n\n${message}`)) {
        void submit();
      }
      return;
    }
    Alert.alert(meeting?.status === 'Selesai' ? 'Simpan koreksi?' : 'Kirim absensi?', message, [
      { text: 'Periksa lagi', style: 'cancel' },
      { text: 'Simpan', onPress: () => void submit() },
    ]);
  }

  if (loading && !meeting) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: theme.background }}>
        <LoadingState label="Memuat absensi…" />
      </ScrollView>
    );
  }
  if (error && !meeting) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: theme.background }}>
        <ErrorState message={error} onRetry={() => void load()} />
      </ScrollView>
    );
  }
  if (!meeting) return null;

  const total = meeting.students.length;
  const progres = total > 0 ? Math.round((tercatat / total) * 100) : 0;

  return (
    <View style={styles.screen}>
      <KeyboardAwareScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}>
        <Panel>
          <View style={styles.headerRow}>
            <View style={styles.time}>
              <ThemedText selectable style={styles.timeStart}>
                {meeting.task.start_time}
              </ThemedText>
              <ThemedText selectable style={[styles.timeEnd, { color: theme.textMuted }]}>
                {meeting.task.end_time}
              </ThemedText>
            </View>
            <View style={[styles.rail, { backgroundColor: theme.primary }]} />
            <View style={styles.headerText}>
              <ThemedText selectable type="h2">
                {meeting.task.subject} · {meeting.task.class.name}
              </ThemedText>
              <ThemedText selectable type="caption" themeColor="textSecondary">
                {formatDate(meeting.date)} · {meeting.task.place}
              </ThemedText>
            </View>
            <Badge label={meeting.status} tone={meeting.status === 'Selesai' ? 'primary' : 'warning'} />
          </View>
        </Panel>

        <Panel>
          <Overline>Kehadiran Anda</Overline>
          <StatusSelector
            value={teacherStatus}
            onChange={(value) => {
              setTeacherStatus(value);
              setSuccess(null);
            }}
          />
          <Field
            value={teacherNotes}
            onChangeText={(value) => {
              setTeacherNotes(value);
              setSuccess(null);
            }}
            multiline
            placeholder="Catatan guru (opsional)"
          />
        </Panel>

        <View style={styles.santriHeader}>
          <View style={styles.santriHeaderText}>
            <ThemedText selectable type="h3">
              Santri · {total} orang
            </ThemedText>
            <View style={styles.progressRow}>
              <View style={[styles.progressTrack, { backgroundColor: theme.backgroundElement }]}>
                <View
                  style={[styles.progressFill, { width: `${progres}%`, backgroundColor: theme.primary }]}
                />
              </View>
              <ThemedText selectable type="caption" themeColor="textSecondary" style={styles.progressText}>
                {tercatat}/{total}
              </ThemedText>
            </View>
          </View>
          <AppButton label="Semua hadir" icon="check" variant="secondary" size="sm" onPress={markAllPresent} />
        </View>

        {meeting.students.map((student, index) => {
          const draft = students[student.student_id] ?? { status: 'Hadir' as const, notes: '' };
          return (
            <View
              key={student.student_id}
              style={[styles.studentCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.studentTitle}>
                <View style={[styles.number, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText selectable type="caption" themeColor="textSecondary">
                    {String(index + 1).padStart(2, '0')}
                  </ThemedText>
                </View>
                <View style={styles.studentText}>
                  <ThemedText selectable type="h3">
                    {student.name}
                  </ThemedText>
                  <ThemedText selectable type="caption" themeColor="textMuted">
                    NIS {student.nis}
                  </ThemedText>
                </View>
              </View>
              <StatusSelector
                value={draft.status}
                onChange={(status) => updateStudent(student.student_id, { status })}
              />
              <Field
                value={draft.notes}
                onChangeText={(notes) => updateStudent(student.student_id, { notes })}
                placeholder="Catatan santri (opsional)"
              />
            </View>
          );
        })}

        <Panel>
          <Overline>Ringkasan</Overline>
          <StatusRecap statuses={counts} total={total} />
          {meeting.status === 'Selesai' ? (
            <>
              <Divider />
              <Field
                label="Alasan koreksi"
                value={correctionReason}
                onChangeText={setCorrectionReason}
                multiline
                placeholder="Wajib diisi untuk menyimpan koreksi"
              />
            </>
          ) : null}
          {error ? (
            <ThemedText selectable type="caption" themeColor="danger" accessibilityLiveRegion="assertive">
              {error}
            </ThemedText>
          ) : null}
          {success ? (
            <ThemedText selectable type="caption" themeColor="success" accessibilityLiveRegion="polite">
              {success}
            </ThemedText>
          ) : null}
        </Panel>
      </KeyboardAwareScrollView>

      <ActionBar>
        <AppButton
          label={meeting.status === 'Selesai' ? 'Simpan koreksi' : 'Konfirmasi dan kirim'}
          style={styles.grow}
          onPress={confirmSubmit}
          loading={submitting}
          disabled={meeting.students.some((student) => !students[student.student_id])}
        />
      </ActionBar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 14,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 13 },
  time: { width: 52, gap: 2 },
  timeStart: { fontSize: 16, lineHeight: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  timeEnd: { fontSize: 12, lineHeight: 15, fontWeight: '500', fontVariant: ['tabular-nums'] },
  rail: { width: 2, borderRadius: 2, alignSelf: 'stretch' },
  headerText: { flex: 1, gap: 3 },
  santriHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 },
  santriHeaderText: { flex: 1, gap: 5 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: { flex: 1, height: 5, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 999 },
  progressText: { fontVariant: ['tabular-nums'] },
  studentCard: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    padding: 14,
    gap: 11,
  },
  studentTitle: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  number: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentText: { flex: 1, gap: 1 },
  grow: { flex: 1 },
});
