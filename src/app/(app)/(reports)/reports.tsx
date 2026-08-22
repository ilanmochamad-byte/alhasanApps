import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, TextInput, View } from 'react-native';

import { actionableError, api } from '@/api/client';
import type { AttendanceStatus, ReportFilters, ReportOptions, ReportResponse } from '@/api/types';
import { AppButton } from '@/components/app-button';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { openPrintDialog, shareReportPdf } from '@/report/report-document';

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function monthStart() {
  const date = new Date();
  date.setDate(1);
  return isoDate(date);
}

export default function ReportsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const initial = useMemo<ReportFilters>(() => ({ date_from: monthStart(), date_to: isoDate(new Date()) }), []);
  const [from, setFrom] = useState(initial.date_from);
  const [to, setTo] = useState(initial.date_to);
  const [status, setStatus] = useState<AttendanceStatus | undefined>();
  const [scheduleId, setScheduleId] = useState<number | undefined>();
  const [applied, setApplied] = useState<ReportFilters>(initial);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ReportResponse | null>(null);
  const [options, setOptions] = useState<ReportOptions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [documentAction, setDocumentAction] = useState<'print' | 'share' | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const [report, filterOptions] = await Promise.all([
        api.report(applied, page),
        options ? Promise.resolve(options) : api.reportOptions(),
      ]);
      setData(report);
      setOptions(filterOptions);
    } catch (caught) {
      setError(actionableError(caught));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [applied, options, page]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  function applyFilters() {
    setPage(1);
    setApplied({ date_from: from.trim(), date_to: to.trim(), status, schedule_id: scheduleId });
  }

  async function runDocumentAction(action: 'print' | 'share') {
    setDocumentAction(action);
    setError(null);
    try {
      if (action === 'print') await openPrintDialog(applied);
      else await shareReportPdf(applied);
    } catch (caught) {
      setError(actionableError(caught));
    } finally {
      setDocumentAction(null);
    }
  }

  const statusOptions: (AttendanceStatus | undefined)[] = [undefined, 'Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpa'];
  const statusTotal = data ? Object.values(data.summary.statuses).reduce((sum, count) => sum + count, 0) : 0;

  return (
    <KeyboardAwareScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.primary} />}>
      <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ThemedText selectable style={styles.panelTitle}>Filter laporan saya</ThemedText>
        <ThemedText selectable themeColor="textSecondary">Server selalu membatasi hasil pada jadwal guru yang sedang masuk.</ThemedText>
        <View style={styles.row}><View style={styles.field}><ThemedText selectable type="smallBold">Dari</ThemedText><TextInput value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" placeholderTextColor={theme.textSecondary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} /></View><View style={styles.field}><ThemedText selectable type="smallBold">Sampai</ThemedText><TextInput value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" placeholderTextColor={theme.textSecondary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} /></View></View>
        <ThemedText selectable type="smallBold">Status</ThemedText>
        <View style={styles.chips}>{statusOptions.map((item) => <AppButton key={item ?? 'all'} label={item ?? 'Semua'} variant={status === item ? 'primary' : 'secondary'} onPress={() => setStatus(item)} />)}</View>
        {options && options.schedules.length > 0 ? <><ThemedText selectable type="smallBold">Jadwal</ThemedText><View style={styles.scheduleOptions}><AppButton label="Semua jadwal saya" variant={scheduleId === undefined ? 'primary' : 'secondary'} onPress={() => setScheduleId(undefined)} />{options.schedules.map((schedule) => <AppButton key={schedule.id} label={schedule.label} variant={scheduleId === schedule.id ? 'primary' : 'secondary'} onPress={() => setScheduleId(schedule.id)} />)}</View></> : null}
        <AppButton label="Terapkan filter" onPress={applyFilters} />
      </View>

      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {loading && !data ? <LoadingState label="Memuat laporan…" /> : data ? <>
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: theme.primary }]}><ThemedText selectable style={{ color: theme.onPrimary }}>Pertemuan</ThemedText><ThemedText selectable style={[styles.summaryNumber, { color: theme.onPrimary }]}>{data.summary.meeting_count}</ThemedText></View>
          <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}><ThemedText selectable themeColor="textSecondary">Baris detail</ThemedText><ThemedText selectable style={styles.summaryNumber}>{data.summary.detail_count}</ThemedText></View>
        </View>
        <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}><ThemedText selectable style={styles.panelTitle}>Rekap status</ThemedText><View style={styles.statusGrid}>{Object.entries(data.summary.statuses).map(([label, count]) => <View key={label} style={styles.statusItem}><ThemedText selectable type="small" themeColor="textSecondary">{label}</ThemedText><ThemedText selectable style={styles.statusNumber}>{count}</ThemedText></View>)}</View><ThemedText selectable type="small" themeColor={statusTotal === data.summary.detail_count ? 'success' : 'danger'}>{statusTotal} status = {data.summary.detail_count} baris detail</ThemedText></View>
        <View style={styles.documentButtons}><View style={styles.buttonFlex}><AppButton label="Cetak / buka PDF" loading={documentAction === 'print'} disabled={documentAction !== null} onPress={() => void runDocumentAction('print')} /></View><View style={styles.buttonFlex}><AppButton label={process.env.EXPO_OS === 'web' ? 'Cetak / simpan PDF' : 'Bagikan PDF'} variant="secondary" loading={documentAction === 'share'} disabled={documentAction !== null} onPress={() => void runDocumentAction('share')} /></View></View>
        <ThemedText selectable style={styles.sectionTitle}>Ringkasan jadwal</ThemedText>
        {data.schedules.length === 0 ? <EmptyState title="Laporan kosong" message="Belum ada absensi sesuai filter." /> : data.schedules.map((row) => <View key={row.schedule_id} style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}><ThemedText selectable style={styles.cardTitle}>{row.subject} · {row.class.name}</ThemedText><ThemedText selectable themeColor="textSecondary">{row.book} · Jadwal #{row.schedule_id}</ThemedText><ThemedText selectable>{row.meeting_count} pertemuan · {row.detail_count} baris kehadiran</ThemedText></View>)}
        <ThemedText selectable style={styles.sectionTitle}>Detail kehadiran</ThemedText>
        {data.items.map((row) => <View key={`${row.subject_type}-${row.attendance_id}`} style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}><View style={styles.cardHeading}><View style={{ flex: 1, gap: 2 }}><ThemedText selectable style={styles.cardTitle}>{row.subject_name}</ThemedText><ThemedText selectable type="small" themeColor="textSecondary">{row.subject_type} · {row.identity_number || 'Tanpa nomor identitas'}</ThemedText></View><ThemedText selectable style={{ fontWeight: '800', color: theme.primary }}>{row.attendance_status}</ThemedText></View><ThemedText selectable>{row.meeting_date} · {row.subject} · {row.class_name}</ThemedText><ThemedText selectable type="small" themeColor="textSecondary">Pencatat: {row.recorder_name ?? '-'} · diperbarui {row.updated_at}</ThemedText><AppButton label="Buka detail pertemuan" variant="secondary" onPress={() => router.push({ pathname: '/report/[id]', params: { id: String(row.meeting_id) } })} /></View>)}
        {data.pagination.total_pages > 1 ? <View style={styles.documentButtons}><View style={styles.buttonFlex}><AppButton label="Sebelumnya" variant="secondary" disabled={page <= 1} onPress={() => setPage((value) => Math.max(1, value - 1))} /></View><ThemedText selectable style={{ fontVariant: ['tabular-nums'] }}>{page}/{data.pagination.total_pages}</ThemedText><View style={styles.buttonFlex}><AppButton label="Berikutnya" variant="secondary" disabled={page >= data.pagination.total_pages} onPress={() => setPage((value) => value + 1)} /></View></View> : null}
      </> : null}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 110, gap: 14, maxWidth: 760, width: '100%', alignSelf: 'center' },
  panel: { borderWidth: 1, borderRadius: 18, borderCurve: 'continuous', padding: 16, gap: 10 },
  panelTitle: { fontSize: 18, fontWeight: '900' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { flex: 1, minWidth: 135, gap: 6 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scheduleOptions: { gap: 8 },
  summaryGrid: { flexDirection: 'row', gap: 12 },
  summaryCard: { flex: 1, borderRadius: 18, borderCurve: 'continuous', padding: 16, gap: 4 },
  summaryNumber: { fontSize: 30, lineHeight: 36, fontWeight: '900', fontVariant: ['tabular-nums'] },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statusItem: { minWidth: 74, gap: 2 },
  statusNumber: { fontSize: 22, lineHeight: 27, fontWeight: '900', fontVariant: ['tabular-nums'] },
  documentButtons: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  buttonFlex: { flex: 1 },
  sectionTitle: { fontSize: 20, fontWeight: '900', paddingTop: 8 },
  cardTitle: { fontSize: 17, fontWeight: '800' },
  cardHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
});
