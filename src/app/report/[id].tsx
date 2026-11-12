import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { actionableError, api } from '@/api/client';
import type { AttendanceStatus, ReportMeetingDetail } from '@/api/types';
import { AppIcon } from '@/components/app-icon';
import { PesertaKosong, PesertaSaring } from '@/components/peserta-saring';
import { StackScreen } from '@/components/screen-shell';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { IKON_KEHADIRAN } from '@/components/status-selector';
import { ThemedText } from '@/components/themed-text';
import { AvatarInisial } from '@/components/ui/avatar-inisial';
import { InfoRow } from '@/components/ui/info-row';
import { StatusPill, type StatusTone } from '@/components/ui/status-pill';
import { statusPalette } from '@/components/ui/status-recap';
import { Overline, Panel } from '@/components/ui/surface';
import { Elevation, Layout, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { daftarKelas, labelKelas, namaKelasAsal } from '@/lib/kelas-jadwal';
import { saringPeserta, tabKelas, TAB_SEMUA } from '@/lib/peserta-saring';

const NADA: Record<AttendanceStatus, StatusTone> = { Hadir: 'success', Izin: 'info', Terlambat: 'warning', Sakit: 'violet', Alpa: 'danger' };
const URUTAN: AttendanceStatus[] = ['Hadir', 'Izin', 'Terlambat', 'Sakit', 'Alpa'];

/** Pil status kehadiran: ikon + teks; "Belum dicatat" netral. */
function PilKehadiran({ status }: { status: AttendanceStatus | null }) {
  return status ? (
    <StatusPill label={status} tone={NADA[status] ?? 'neutral'} icon={IKON_KEHADIRAN[status] ?? 'info'} />
  ) : (
    <StatusPill label="Belum dicatat" tone="neutral" icon="clock" />
  );
}

/**
 * Rincian laporan satu pertemuan (hanya baca; redesain gelombang 2 §4.3):
 * kepala pertemuan, angka per status dari ringkasan server, cari nama/NIS,
 * tab kelas asal, dan daftar santri dengan pil status.
 */
export default function ReportMeetingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  // Teks sistem sangat besar: ringkasan mini menjadi kisi 3 + 2 agar label tidak terpotong.
  const ringkasBesar = useWindowDimensions().fontScale > 1.35;
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
  const palette = statusPalette(theme);

  return (
    <StackScreen title="Rincian pertemuan" subtitle={meeting ? `Pertemuan ${meeting.date}` : undefined}>
      <ScrollView contentInsetAdjustmentBehavior="never" style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
        {!meeting && !error ? <LoadingState label="Memuat detail pertemuan…" /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : meeting ? <>
          <View style={[styles.kepala, { backgroundColor: theme.primarySoft, borderColor: theme.primaryBorder }]}>
            <ThemedText selectable type="h2">{meeting.task.subject} · {labelKelas(meeting.task)}</ThemedText>
            {gabungan ? <ThemedText selectable type="caption" themeColor="textSecondary">Kelas gabungan · {kelas.length} kelas dalam satu pertemuan</ThemedText> : null}
            <ThemedText selectable type="caption" themeColor="textSecondary">{meeting.date} · {meeting.task.day}, {meeting.task.start_time}–{meeting.task.end_time}</ThemedText>
            <StatusPill label={meeting.status} tone={meeting.status === 'Selesai' ? 'success' : 'warning'} icon={meeting.status === 'Selesai' ? 'check' : 'clock'} />
          </View>

          <Panel style={styles.rincian}>
            <InfoRow icon="book" label="Kitab" value={meeting.task.book} />
            <InfoRow icon="pin" label="Tempat" value={meeting.task.place} />
            <InfoRow icon="person" label="Guru" value={meeting.task.teacher.name} last />
          </Panel>

          <Panel>
            <Overline>Kehadiran guru</Overline>
            {meeting.teacher_attendance ? <>
              <PilKehadiran status={meeting.teacher_attendance.status} />
              <ThemedText selectable>{meeting.teacher_attendance.notes || 'Tanpa catatan'}</ThemedText>
              <ThemedText selectable type="caption" themeColor="textSecondary">Pencatat: {meeting.teacher_attendance.recorded_by ?? '-'} · diperbarui {meeting.teacher_attendance.updated_at}</ThemedText>
            </> : <ThemedText selectable themeColor="textSecondary">Belum dicatat.</ThemedText>}
          </Panel>

          <ThemedText selectable type="h2" accessibilityRole="header" style={styles.bagian}>Peserta ({meeting.student_summary.recorded_count}/{meeting.student_summary.participant_count})</ThemedText>

          {/* Angka per status dari ringkasan server. */}
          <View style={[styles.ringkas, { backgroundColor: theme.card, borderColor: theme.border, boxShadow: Elevation.card }]}>
            {URUTAN.map((status) => (
              <View key={status} accessible accessibilityLabel={`${status}: ${meeting.student_summary.statuses[status] ?? 0}`} style={[styles.ringkasSel, ringkasBesar && styles.ringkasSelBesar]}>
                <AppIcon name={IKON_KEHADIRAN[status]} size={16} color={palette[status]} />
                <ThemedText type="numeralCard" style={styles.angka}>{meeting.student_summary.statuses[status] ?? 0}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary" numberOfLines={ringkasBesar ? undefined : 1}>{status}</ThemedText>
              </View>
            ))}
          </View>

          {meeting.students.length > 0 ? <PesertaSaring kataKunci={kataKunci} onKataKunci={setKataKunci} tabs={tabs} tab={tabAktif} onTab={setTab} tampil={tampil} total={meeting.students.length} /> : null}
          {tampil === 0 && meeting.students.length > 0 ? <PesertaKosong onReset={() => { setKataKunci(''); setTab(TAB_SEMUA); }} /> : null}
          {kelompok.flatMap((grup) => [
            ...(gabungan && grup.nama ? [<ThemedText key={`h-${grup.key}`} selectable type="label" accessibilityRole="header">{grup.nama} · {grup.items.length} santri</ThemedText>] : []),
            ...grup.items.map((student) => (
              <View key={student.student_id} style={[styles.baris, { backgroundColor: theme.card, borderColor: theme.border, boxShadow: Elevation.card }]}>
                <View style={styles.heading}>
                  <AvatarInisial nama={student.name} />
                  <View style={styles.identitas}>
                    <ThemedText selectable type="bodyBold">{student.name}</ThemedText>
                    <ThemedText selectable type="caption" themeColor="textSecondary">NIS {student.nis}{gabungan && namaKelasAsal(student, kelas) ? ` · Kelas ${namaKelasAsal(student, kelas)}` : ''}</ThemedText>
                  </View>
                </View>
                <PilKehadiran status={student.status} />
                <ThemedText selectable type="labelSmall">{student.notes || 'Tanpa catatan'}</ThemedText>
                <ThemedText selectable type="caption" themeColor="textSecondary">Pencatat: {student.recorded_by ?? '-'} · diperbarui {student.updated_at ?? '-'}</ThemedText>
              </View>
            )),
          ])}
        </> : null}
      </ScrollView>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Layout.screen, paddingTop: 12, paddingBottom: 48, gap: 12, maxWidth: 760, width: '100%', alignSelf: 'center' },
  kepala: { borderWidth: 1, borderRadius: Radius.xxl, borderCurve: 'continuous', padding: 16, gap: 6 },
  rincian: { gap: 0, paddingVertical: 4 },
  bagian: { paddingTop: 8 },
  ringkas: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderRadius: Radius.xxl, borderCurve: 'continuous', paddingVertical: 12, paddingHorizontal: 6, rowGap: 10 },
  ringkasSel: { flexGrow: 1, flexBasis: 56, alignItems: 'center', gap: 2, paddingHorizontal: 2 },
  ringkasSelBesar: { flexBasis: '30%' },
  angka: { fontVariant: ['tabular-nums'] },
  baris: { borderWidth: 1, borderRadius: Radius.xxl, borderCurve: 'continuous', padding: 14, gap: 8 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  identitas: { flex: 1, gap: 1 },
});
