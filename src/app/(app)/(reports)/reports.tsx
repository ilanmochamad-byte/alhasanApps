import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { actionableError, api } from '@/api/client';
import type { AttendanceStatus, ReportFilters, ReportOptions, ReportResponse } from '@/api/types';
import { AppButton } from '@/components/app-button';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import { ScreenHeader } from '@/components/screen-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Field } from '@/components/ui/app-field';
import { Chip, ChipRow } from '@/components/ui/chip';
import { IconButton } from '@/components/ui/icon-button';
import { StatTile } from '@/components/ui/stat-tile';
import { StatusRecap } from '@/components/ui/status-recap';
import { Card, Overline, Panel, SectionHeader } from '@/components/ui/surface';
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

function ringkasTanggal(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export default function ReportsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const initial = useMemo<ReportFilters>(
    () => ({ date_from: monthStart(), date_to: isoDate(new Date()) }),
    [],
  );
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
  // Panel saringan disembunyikan secara baku: dulu ia memenuhi layar sebelum
  // satu angka pun terlihat.
  const [bukaFilter, setBukaFilter] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
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
    },
    [applied, options, page],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function applyFilters() {
    setPage(1);
    setApplied({ date_from: from.trim(), date_to: to.trim(), status, schedule_id: scheduleId });
    setBukaFilter(false);
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

  const statusOptions: (AttendanceStatus | undefined)[] = [
    undefined,
    'Hadir',
    'Terlambat',
    'Izin',
    'Sakit',
    'Alpa',
  ];
  const statusTotal = data
    ? Object.values(data.summary.statuses).reduce((sum, count) => sum + count, 0)
    : 0;
  const labelJadwal = scheduleId
    ? (options?.schedules.find((item) => item.id === scheduleId)?.label ?? 'Satu jadwal')
    : 'Semua jadwal';

  return (
    <KeyboardAwareScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.primary} />
      }>
      <ScreenHeader
        title="Laporan"
        actions={
          <IconButton
            icon="filter"
            accessibilityLabel={bukaFilter ? 'Tutup filter' : 'Buka filter'}
            onPress={() => setBukaFilter((current) => !current)}
          />
        }
      />

      {/* Ringkasan saringan yang sedang aktif — dapat diketuk untuk membukanya. */}
      <ChipRow>
        <Chip
          icon="calendar"
          label={`${ringkasTanggal(applied.date_from)} – ${ringkasTanggal(applied.date_to)}`}
          selected
          onPress={() => setBukaFilter(true)}
        />
        <Chip label={status ?? 'Semua status'} onPress={() => setBukaFilter(true)} />
        <Chip label={labelJadwal} onPress={() => setBukaFilter(true)} />
      </ChipRow>

      {bukaFilter ? (
        <Panel>
          <Overline>Filter laporan saya</Overline>
          <ThemedText selectable type="caption" themeColor="textSecondary">
            Server selalu membatasi hasil pada jadwal guru yang sedang masuk.
          </ThemedText>
          <View style={styles.row}>
            <View style={styles.field}>
              <Field label="Dari" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" />
            </View>
            <View style={styles.field}>
              <Field label="Sampai" value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" />
            </View>
          </View>

          <View style={styles.filterGroup}>
            <ThemedText selectable type="label">
              Status
            </ThemedText>
            <ChipRow>
              {statusOptions.map((item) => (
                <Chip
                  key={item ?? 'all'}
                  accessibilityRole="radio"
                  label={item ?? 'Semua'}
                  selected={status === item}
                  onPress={() => setStatus(item)}
                />
              ))}
            </ChipRow>
          </View>

          {options && options.schedules.length > 0 ? (
            <View style={styles.filterGroup}>
              <ThemedText selectable type="label">
                Jadwal
              </ThemedText>
              <ChipRow>
                <Chip
                  accessibilityRole="radio"
                  label="Semua jadwal saya"
                  selected={scheduleId === undefined}
                  onPress={() => setScheduleId(undefined)}
                />
                {options.schedules.map((schedule) => (
                  <Chip
                    key={schedule.id}
                    accessibilityRole="radio"
                    label={schedule.label}
                    selected={scheduleId === schedule.id}
                    onPress={() => setScheduleId(schedule.id)}
                  />
                ))}
              </ChipRow>
            </View>
          ) : null}

          <AppButton label="Terapkan filter" onPress={applyFilters} />
        </Panel>
      ) : null}

      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {loading && !data ? (
        <LoadingState label="Memuat laporan…" />
      ) : data ? (
        <>
          <View style={styles.statRow}>
            <StatTile label="Pertemuan" value={data.summary.meeting_count} tone="primary" />
            <StatTile label="Baris kehadiran" value={data.summary.detail_count} />
          </View>

          <Panel>
            <View style={styles.recapHeader}>
              <ThemedText selectable type="h3" style={styles.recapTitle}>
                Rekap kehadiran
              </ThemedText>
              <ThemedText selectable type="caption" themeColor="textMuted">
                {data.summary.detail_count} baris
              </ThemedText>
            </View>
            <StatusRecap statuses={data.summary.statuses} total={data.summary.detail_count} />
            <ThemedText
              selectable
              type="caption"
              themeColor={statusTotal === data.summary.detail_count ? 'success' : 'danger'}>
              {statusTotal} status = {data.summary.detail_count} baris detail
            </ThemedText>
          </Panel>

          <View style={styles.documentButtons}>
            <View style={styles.buttonFlex}>
              <AppButton
                label="Cetak PDF"
                icon="printer"
                variant="secondary"
                loading={documentAction === 'print'}
                disabled={documentAction !== null}
                onPress={() => void runDocumentAction('print')}
              />
            </View>
            <View style={styles.buttonFlex}>
              <AppButton
                label={process.env.EXPO_OS === 'web' ? 'Simpan PDF' : 'Bagikan'}
                icon="share"
                variant="secondary"
                loading={documentAction === 'share'}
                disabled={documentAction !== null}
                onPress={() => void runDocumentAction('share')}
              />
            </View>
          </View>

          <SectionHeader title="Ringkasan jadwal" />
          {data.schedules.length === 0 ? (
            <EmptyState title="Laporan kosong" message="Belum ada absensi sesuai filter." />
          ) : (
            data.schedules.map((row) => (
              <Card key={row.schedule_id}>
                <ThemedText selectable type="h3">
                  {row.subject} · {row.class.name}
                </ThemedText>
                <ThemedText selectable type="caption" themeColor="textSecondary">
                  {row.book} · Jadwal #{row.schedule_id}
                </ThemedText>
                <ThemedText selectable type="caption" themeColor="textMuted">
                  {row.meeting_count} pertemuan · {row.detail_count} baris kehadiran
                </ThemedText>
              </Card>
            ))
          )}

          <SectionHeader title="Detail kehadiran" />
          {data.items.map((row) => (
            <Card
              key={`${row.subject_type}-${row.attendance_id}`}
              onPress={() => router.push({ pathname: '/report/[id]', params: { id: String(row.meeting_id) } })}
              accessibilityLabel={`Buka detail pertemuan ${row.subject_name}, ${row.attendance_status}`}>
              <View style={styles.detailHeader}>
                <View style={styles.detailIdentity}>
                  <ThemedText selectable type="h3">
                    {row.subject_name}
                  </ThemedText>
                  <ThemedText selectable type="caption" themeColor="textMuted">
                    {row.subject_type} · {row.identity_number || 'Tanpa nomor identitas'}
                  </ThemedText>
                </View>
                <ThemedText selectable type="label" themeColor="primary">
                  {row.attendance_status}
                </ThemedText>
              </View>
              <ThemedText selectable type="caption" themeColor="textSecondary">
                {row.meeting_date} · {row.subject} · {row.class_name}
              </ThemedText>
              <ThemedText selectable type="caption" themeColor="textMuted">
                Pencatat: {row.recorder_name ?? '-'} · diperbarui {row.updated_at}
              </ThemedText>
            </Card>
          ))}

          {data.pagination.total_pages > 1 ? (
            <View style={styles.documentButtons}>
              <View style={styles.buttonFlex}>
                <AppButton
                  label="Sebelumnya"
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onPress={() => setPage((value) => Math.max(1, value - 1))}
                />
              </View>
              <ThemedText selectable type="caption" style={styles.pageNumber}>
                {page}/{data.pagination.total_pages}
              </ThemedText>
              <View style={styles.buttonFlex}>
                <AppButton
                  label="Berikutnya"
                  variant="secondary"
                  size="sm"
                  disabled={page >= data.pagination.total_pages}
                  onPress={() => setPage((value) => value + 1)}
                />
              </View>
            </View>
          ) : null}
        </>
      ) : null}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 120,
    gap: 14,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { flex: 1, minWidth: 135 },
  filterGroup: { gap: 8 },
  statRow: { flexDirection: 'row', gap: 12 },
  recapHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  recapTitle: { flex: 1 },
  documentButtons: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  buttonFlex: { flex: 1 },
  pageNumber: { fontVariant: ['tabular-nums'] },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  detailIdentity: { flex: 1, gap: 2 },
});
