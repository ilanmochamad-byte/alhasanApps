import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { actionableError, api, createIdempotencyKey } from '@/api/client';
import type { AttendancePayload, AttendanceStatus, MeetingDetail, StudentMeetingRow } from '@/api/types';
import { AppButton } from '@/components/app-button';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import { PesertaKosong, PesertaSaring } from '@/components/peserta-saring';
import { formatDate } from '@/components/schedule-card';
import type { HeaderMenuItem } from '@/components/screen-header';
import { StackScreen } from '@/components/screen-shell';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { IKON_KEHADIRAN, StatusSelector } from '@/components/status-selector';
import { ThemedText } from '@/components/themed-text';
import { ActionBar } from '@/components/ui/action-bar';
import { Field } from '@/components/ui/app-field';
import { AvatarInisial } from '@/components/ui/avatar-inisial';
import { Notice } from '@/components/ui/notice';
import { StatusPill } from '@/components/ui/status-pill';
import { StatusRecap, statusPalette } from '@/components/ui/status-recap';
import { Divider, Overline, Panel } from '@/components/ui/surface';
import { AppIcon } from '@/components/app-icon';
import { Elevation, Layout, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { daftarKelas, labelKelas, namaKelasAsal } from '@/lib/kelas-jadwal';
import { gabungDrafPeserta, ringkasPerubahanPeserta } from '@/lib/perbarui-peserta';
import { nomorUrut, saringPeserta, tabKelas, TAB_SEMUA } from '@/lib/peserta-saring';

type StudentDraft = Record<number, { status: AttendanceStatus; notes: string }>;

const JUDUL = 'Absensi pertemuan';
/** Urutan ringkasan mini = urutan `StatusRecap` (lolos uji keterbedaan warna). */
const URUTAN_RINGKAS: AttendanceStatus[] = ['Hadir', 'Izin', 'Terlambat', 'Sakit', 'Alpa'];

export default function MeetingScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const meetingId = Number(params.id);
  const theme = useTheme();
  // Teks sistem sangat besar: ringkasan mini menjadi kisi 3 + 2 agar label tidak terpotong.
  const ringkasBesar = useWindowDimensions().fontScale > 1.35;
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [teacherStatus, setTeacherStatus] = useState<AttendanceStatus>('Hadir');
  const [teacherNotes, setTeacherNotes] = useState('');
  const [students, setStudents] = useState<StudentDraft>({});
  const [correctionReason, setCorrectionReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Hasil "Perbarui daftar", tampil tepat di bawah tombolnya.
  const [refreshInfo, setRefreshInfo] = useState<{ text: string; error: boolean } | null>(null);
  // Saringan TAMPILAN saja: draf dan payload tetap seluruh peserta.
  const [kataKunci, setKataKunci] = useState('');
  const [tab, setTab] = useState<string>(TAB_SEMUA);
  const attempt = useRef<{ signature: string; key: string } | null>(null);
  // Satu kiriman pada satu waktu: ketukan ganda tidak mengirim dua permintaan.
  const inFlight = useRef(false);

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

  // Perbarui daftar santri (pertemuan Dibuka): server menyelaraskan peserta
  // dengan penempatan kelas terbaru; isian guru untuk santri yang tetap
  // tercantum dipertahankan, santri baru diisi "Hadir".
  async function refreshParticipants() {
    if (inFlight.current || !meeting) return;
    inFlight.current = true;
    setRefreshing(true);
    setError(null);
    setSuccess(null);
    setRefreshInfo(null);
    try {
      const updated = await api.refreshParticipants(meetingId);
      setMeeting(updated);
      setStudents((current) =>
        gabungDrafPeserta(current, updated.students, (student) => ({
          status: (student.attendance?.status as AttendanceStatus | undefined) ?? 'Hadir',
          notes: student.attendance?.notes ?? '',
        })),
      );
      setRefreshInfo({ text: ringkasPerubahanPeserta(updated.participant_changes), error: false });
    } catch (caught) {
      setRefreshInfo({ text: actionableError(caught), error: true });
    } finally {
      inFlight.current = false;
      setRefreshing(false);
    }
  }

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
    if (inFlight.current) return;
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
    inFlight.current = true;
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
      inFlight.current = false;
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
      <StackScreen title={JUDUL}>
        <ScrollView contentInsetAdjustmentBehavior="never" style={{ backgroundColor: theme.background }}>
          <LoadingState label="Memuat absensi…" />
        </ScrollView>
      </StackScreen>
    );
  }
  if (error && !meeting) {
    return (
      <StackScreen title={JUDUL}>
        <ScrollView contentInsetAdjustmentBehavior="never" style={{ backgroundColor: theme.background }}>
          <ErrorState message={error} onRetry={() => void load()} />
        </ScrollView>
      </StackScreen>
    );
  }
  if (!meeting) return <StackScreen title={JUDUL}>{null}</StackScreen>;

  const total = meeting.students.length;
  const progres = total > 0 ? Math.round((tercatat / total) * 100) : 0;
  const kelas = daftarKelas(meeting.task);
  const gabungan = kelas.length > 1;
  // Tab kelas asal hanya pada kelas gabungan; kelompok dari ID kelas asal
  // snapshot yang cocok dengan kelas pertemuan, bukan dari nama santri.
  const tabs = gabungan ? tabKelas(meeting.students, kelas) : null;
  const tabAktif = tabs?.some((item) => item.key === tab) ? tab : TAB_SEMUA;
  // Jadwal satu kelas tetap satu daftar tanpa judul kelas (tampilan lama).
  const kelompok = saringPeserta(meeting.students, kelas, { tab: tabAktif, kataKunci });
  const tampil = kelompok.reduce((jumlah, grup) => jumlah + grup.items.length, 0);
  // Nomor urut stabil menurut urutan "Semua" (per kelas pada kelas gabungan),
  // tidak berubah saat dicari atau berpindah tab.
  const nomor = nomorUrut(meeting.students, kelas);
  const tersaring = tampil < total;
  const dibuka = meeting.status === 'Dibuka';
  const palette = statusPalette(theme);
  // "Perbarui daftar" adalah tindakan sekunder: pindah ke ⋯ (gelombang 2 §4.3).
  // Hanya ditawarkan pada pertemuan Dibuka, sama seperti sebelumnya.
  const menu: HeaderMenuItem[] = dibuka
    ? [{ label: 'Perbarui daftar', icon: 'refresh', onPress: () => { if (!submitting) void refreshParticipants(); } }]
    : [];

  return (
    <StackScreen title={JUDUL} menu={menu}>
      <KeyboardAwareScrollView
        contentInsetAdjustmentBehavior="never"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}>
        {/* Kepala ringkas: kitab, kelas, tanggal, tempat, status pertemuan. */}
        <View style={[styles.kepala, { backgroundColor: theme.primarySoft, borderColor: theme.primaryBorder }]}>
          <ThemedText selectable type="h2">
            {meeting.task.subject} · {labelKelas(meeting.task)}
          </ThemedText>
          <ThemedText selectable type="caption" themeColor="textSecondary">
            {formatDate(meeting.date)} · {meeting.task.start_time}–{meeting.task.end_time} · {meeting.task.place}
          </ThemedText>
          <StatusPill
            label={meeting.status}
            tone={meeting.status === 'Selesai' ? 'success' : 'warning'}
            icon={meeting.status === 'Selesai' ? 'check' : 'clock'}
          />
        </View>

        {/* Ringkasan mini yang ikut draf: seluruh peserta, bukan hasil saringan. */}
        <View
          accessibilityLabel="Ringkasan isian kehadiran santri"
          style={[styles.ringkas, { backgroundColor: theme.card, borderColor: theme.border, boxShadow: Elevation.card }]}>
          {URUTAN_RINGKAS.map((status) => (
            <View key={status} accessible accessibilityLabel={`${status}: ${counts[status]}`} style={[styles.ringkasSel, ringkasBesar && styles.ringkasSelBesar]}>
              <AppIcon name={IKON_KEHADIRAN[status]} size={16} color={palette[status]} />
              <ThemedText type="numeralCard" style={styles.ringkasAngka}>
                {counts[status]}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary" numberOfLines={ringkasBesar ? undefined : 1}>
                {status}
              </ThemedText>
            </View>
          ))}
        </View>

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
            {gabungan ? (
              <ThemedText selectable type="caption" themeColor="textSecondary">
                Kelas gabungan · {kelas.length} kelas dalam satu pertemuan
              </ThemedText>
            ) : null}
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
        </View>
        <AppButton
          label={`Semua hadir (${total})`}
          icon="check"
          variant="line"
          size="sm"
          onPress={markAllPresent}
          accessibilityHint={`Menandai seluruh ${total} santri pertemuan ini hadir, termasuk yang tidak sedang ditampilkan.`}
        />
        {dibuka && refreshing ? <Notice tone="neutral" icon="refresh" text="Memperbarui daftar santri…" /> : null}
        {dibuka && refreshInfo ? (
          <Notice tone={refreshInfo.error ? 'danger' : 'success'} text={refreshInfo.text} />
        ) : null}
        {dibuka ? (
          <ThemedText selectable type="caption" themeColor="textSecondary">
            Daftar santri berbeda dengan kelas saat ini? Pilih “Perbarui daftar” dari tombol ⋯ di kanan atas.
          </ThemedText>
        ) : null}
        {gabungan || tersaring ? (
          <ThemedText selectable type="caption" themeColor="textSecondary">
            “Semua hadir” berlaku untuk seluruh {total} santri pertemuan ini, termasuk yang tidak sedang
            ditampilkan oleh pencarian atau tab kelas.
          </ThemedText>
        ) : null}

        <PesertaSaring
          kataKunci={kataKunci}
          onKataKunci={setKataKunci}
          tabs={tabs}
          tab={tabAktif}
          onTab={setTab}
          tampil={tampil}
          total={total}
        />

        {tampil === 0 && total > 0 ? (
          <PesertaKosong
            onReset={() => {
              setKataKunci('');
              setTab(TAB_SEMUA);
            }}
          />
        ) : null}

        {kelompok.map((grup) => (
          <View key={grup.key} style={styles.group}>
            {gabungan && grup.nama ? (
              <View style={styles.groupHeader} accessibilityRole="header">
                <Overline>{grup.nama}</Overline>
                <ThemedText selectable type="caption" themeColor="textMuted">
                  {grup.items.length} santri
                </ThemedText>
              </View>
            ) : null}
            {grup.items.map((student) => (
              <StudentCard
                key={student.student_id}
                student={student}
                number={nomor.get(student.student_id) ?? 0}
                kelasAsal={gabungan ? namaKelasAsal(student, kelas) : ''}
                draft={students[student.student_id] ?? { status: 'Hadir', notes: '' }}
                onChange={(patch) => updateStudent(student.student_id, patch)}
              />
            ))}
          </View>
        ))}

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
          <Notice tone="danger" text={error} />
          <Notice tone="success" title={success ? 'Absensi tersimpan' : undefined} text={success} />
        </Panel>
      </KeyboardAwareScrollView>

      <ActionBar>
        <AppButton
          label={meeting.status === 'Selesai' ? 'Simpan koreksi' : 'Kirim absensi'}
          style={styles.grow}
          onPress={confirmSubmit}
          loading={submitting}
          disabled={refreshing || meeting.students.some((student) => !students[student.student_id])}
        />
      </ActionBar>
    </StackScreen>
  );
}

function StudentCard({
  student,
  number,
  kelasAsal,
  draft,
  onChange,
}: {
  student: StudentMeetingRow;
  number: number;
  /** Diisi hanya pada pertemuan kelas gabungan. */
  kelasAsal: string;
  draft: { status: AttendanceStatus; notes: string };
  onChange: (patch: Partial<{ status: AttendanceStatus; notes: string }>) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.studentCard, { backgroundColor: theme.card, borderColor: theme.border, boxShadow: Elevation.card }]}>
      <View style={styles.studentTitle}>
        <AvatarInisial nama={student.name} />
        <View style={styles.studentText}>
          <ThemedText selectable type="bodyBold">
            {student.name}
          </ThemedText>
          <ThemedText selectable type="caption" themeColor="textSecondary">
            NIS {student.nis}
            {kelasAsal ? ` · Kelas ${kelasAsal}` : ''}
          </ThemedText>
        </View>
        <ThemedText type="caption" themeColor="textMuted" accessibilityLabel={`Nomor urut ${number}`} style={styles.number}>
          {String(number).padStart(2, '0')}
        </ThemedText>
      </View>
      <StatusSelector compact value={draft.status} onChange={(status) => onChange({ status })} />
      <Field
        value={draft.notes}
        onChangeText={(notes) => onChange({ notes })}
        placeholder="Catatan santri (opsional)"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Layout.screen,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 14,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  kepala: { borderWidth: 1, borderRadius: Radius.xxl, borderCurve: 'continuous', padding: 16, gap: 6 },
  ringkas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderRadius: Radius.xxl,
    borderCurve: 'continuous',
    paddingVertical: 12,
    paddingHorizontal: 6,
    rowGap: 10,
  },
  ringkasSel: { flexGrow: 1, flexBasis: 56, alignItems: 'center', gap: 2, paddingHorizontal: 2 },
  ringkasSelBesar: { flexBasis: '30%' },
  ringkasAngka: { fontVariant: ['tabular-nums'] },
  santriHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 },
  santriHeaderText: { flex: 1, gap: 5 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: { flex: 1, height: 5, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 999 },
  progressText: { fontVariant: ['tabular-nums'] },
  group: { gap: 12 },
  groupHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: 4 },
  studentCard: {
    borderWidth: 1,
    borderRadius: Radius.xxl,
    borderCurve: 'continuous',
    padding: 14,
    gap: 11,
  },
  studentTitle: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  number: { fontVariant: ['tabular-nums'] },
  studentText: { flex: 1, gap: 1 },
  grow: { flex: 1 },
});
