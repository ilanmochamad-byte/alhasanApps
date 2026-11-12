import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { actionableError, api } from '@/api/client';
import type { AttendanceStatus, ReportFilters, ReportOptions, ReportResponse } from '@/api/types';
import { AppButton } from '@/components/app-button';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import type { HeaderMenuItem } from '@/components/screen-header';
import { StackScreen } from '@/components/screen-shell';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { IKON_KEHADIRAN } from '@/components/status-selector';
import { ThemedText } from '@/components/themed-text';
import { BarChart } from '@/components/ui/bar-chart';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Chip, ChipRow } from '@/components/ui/chip';
import { DateField } from '@/components/ui/date-field';
import { EntityRow } from '@/components/ui/entity-row';
import { FilterPills } from '@/components/ui/filter-pills';
import { HeroCard } from '@/components/ui/hero-card';
import { IconButton } from '@/components/ui/icon-button';
import { Notice } from '@/components/ui/notice';
import { StatusPill, type StatusTone } from '@/components/ui/status-pill';
import { StatusRecap } from '@/components/ui/status-recap';
import { Panel, SectionHeader } from '@/components/ui/surface';
import { Layout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatPendek, isoAwalBulan, isoHariIni, isoTambahHari } from '@/lib/date';
import { openPrintDialog, shareReportPdf } from '@/report/report-document';

/** Nada pil status kehadiran; ikon dan teks selalu menyertai warna. */
const NADA_KEHADIRAN: Record<AttendanceStatus, StatusTone> = {
  Hadir: 'success',
  Izin: 'info',
  Terlambat: 'warning',
  Sakit: 'violet',
  Alpa: 'danger',
};
const URUTAN: AttendanceStatus[] = ['Hadir', 'Izin', 'Terlambat', 'Sakit', 'Alpa'];

type Rentang = 'bulan' | '7' | '30' | 'kustom';

export default function ReportsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const initial = useMemo<ReportFilters>(
    () => ({ date_from: isoAwalBulan(), date_to: isoHariIni() }),
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
  // Pil rentang hanya mengisi tanggal saringan yang sama; bawaan tetap bulan berjalan.
  const [rentang, setRentang] = useState<Rentang>('bulan');

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
    setRentang('kustom');
    setBukaFilter(false);
  }

  /** Pil rentang: mengganti tanggal saja; status dan jadwal yang berlaku dipertahankan. */
  function pilihRentang(next: Rentang) {
    if (next === 'kustom') {
      setBukaFilter(true);
      return;
    }
    const sampai = isoHariIni();
    const dari = next === 'bulan' ? isoAwalBulan() : isoTambahHari(next === '7' ? -6 : -29);
    setRentang(next);
    setFrom(dari);
    setTo(sampai);
    setPage(1);
    setApplied((current) => ({ ...current, date_from: dari, date_to: sampai }));
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
  // Chip ringkasan HARUS membaca `applied`, bukan state draf: kalau membaca
  // draf, ia akan mengaku "Sakit" padahal tabel di bawahnya masih hasil lama.
  const labelJadwalAktif = applied.schedule_id
    ? (options?.schedules.find((item) => item.id === applied.schedule_id)?.label ?? 'Satu jadwal')
    : 'Semua jadwal';

  const hadir = data?.summary.statuses.Hadir ?? 0;
  const persenHadir =
    data && data.summary.detail_count > 0 ? `${Math.round((hadir / data.summary.detail_count) * 100)}%` : '—';
  // Cetak dan bagikan adalah tindakan sekunder: di balik ⋯ (K-7).
  const menu: HeaderMenuItem[] = data
    ? [
        { label: 'Cetak PDF', icon: 'printer', onPress: () => { if (documentAction === null) void runDocumentAction('print'); } },
        {
          label: process.env.EXPO_OS === 'web' ? 'Simpan PDF' : 'Bagikan',
          icon: 'share',
          onPress: () => { if (documentAction === null) void runDocumentAction('share'); },
        },
      ]
    : [];

  return (
    <StackScreen
      title="Laporan kehadiran"
      menu={menu}
      actions={
        <IconButton
          icon="filter"
          accessibilityLabel={bukaFilter ? 'Tutup filter' : 'Buka filter'}
          onPress={() => setBukaFilter((current) => !current)}
        />
      }>
      <KeyboardAwareScrollView
        contentInsetAdjustmentBehavior="never"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.primary} />
        }>
        <ThemedText selectable type="body" themeColor="textSecondary">
          Rekap absensi dari sesi yang Anda ajar
        </ThemedText>

        <FilterPills
          accessibilityLabel="Rentang laporan"
          value={rentang}
          onChange={pilihRentang}
          options={[
            { value: 'bulan', label: 'Bulan ini' },
            { value: '7', label: '7 hari' },
            { value: '30', label: '30 hari' },
            { value: 'kustom', label: 'Kustom', icon: 'calendar' },
          ]}
        />

        {/* Ringkasan saringan yang sedang berlaku (dari `applied`, bukan draf). */}
        <ChipRow>
          <Chip
            icon="calendar"
            label={`${formatPendek(applied.date_from)} – ${formatPendek(applied.date_to)}`}
            onPress={() => setBukaFilter(true)}
          />
          <Chip label={applied.status ?? 'Semua status'} onPress={() => setBukaFilter(true)} />
          <Chip label={labelJadwalAktif} onPress={() => setBukaFilter(true)} />
        </ChipRow>

        <BottomSheet visible={bukaFilter} title="Filter laporan saya" onClose={() => setBukaFilter(false)}>
          <ThemedText selectable type="caption" themeColor="textSecondary">
            Server selalu membatasi hasil pada jadwal guru yang sedang masuk.
          </ThemedText>
          <View style={styles.row}>
            <View style={styles.field}>
              <DateField label="Dari" value={from} onChange={setFrom} maximumDate={to} />
            </View>
            <View style={styles.field}>
              <DateField label="Sampai" value={to} onChange={setTo} minimumDate={from} />
            </View>
          </View>

          <View style={styles.filterGroup}>
            <ThemedText selectable type="label">
              Status
            </ThemedText>
            <View accessibilityRole="radiogroup" accessibilityLabel="Saring menurut status">
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
          </View>

          {options && options.schedules.length > 0 ? (
            <View style={styles.filterGroup}>
              <ThemedText selectable type="label">
                Jadwal
              </ThemedText>
              <View accessibilityRole="radiogroup" accessibilityLabel="Saring menurut jadwal">
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
            </View>
          ) : null}

          <AppButton label="Terapkan filter" onPress={applyFilters} />
        </BottomSheet>

        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {documentAction ? (
          <Notice tone="neutral" icon={documentAction === 'print' ? 'printer' : 'share'} text="Menyiapkan dokumen laporan…" />
        ) : null}

        {loading && !data ? (
          <LoadingState label="Memuat laporan…" />
        ) : data ? (
          <>
            {/* Angka utama dari ringkasan server; tanpa pembanding karangan. */}
            <HeroCard
              overline="Persentase hadir"
              value={persenHadir}
              caption={`${hadir} hadir dari ${data.summary.detail_count} baris kehadiran · ${data.summary.meeting_count} pertemuan`}
            />

            <Panel>
              <View style={styles.statRow}>
                <View style={styles.stat}>
                  <ThemedText selectable type="numeralCard" themeColor="primary" style={styles.angka}>
                    {data.summary.meeting_count}
                  </ThemedText>
                  <ThemedText selectable type="labelSmall" themeColor="textSecondary">
                    Pertemuan
                  </ThemedText>
                </View>
                <View style={styles.stat}>
                  <ThemedText selectable type="numeralCard" style={styles.angka}>
                    {data.summary.detail_count}
                  </ThemedText>
                  <ThemedText selectable type="labelSmall" themeColor="textSecondary">
                    Baris kehadiran
                  </ThemedText>
                </View>
              </View>
              <BarChart
                accessibilityLabel="Rekap kehadiran per status"
                height={110}
                data={URUTAN.map((key) => ({ key, label: key, value: data.summary.statuses[key] ?? 0 }))}
              />
              <StatusRecap statuses={data.summary.statuses} total={data.summary.detail_count} />
              <ThemedText
                selectable
                type="caption"
                themeColor={statusTotal === data.summary.detail_count ? 'success' : 'danger'}>
                {statusTotal} status = {data.summary.detail_count} baris detail
              </ThemedText>
            </Panel>

            <SectionHeader title="Ringkasan jadwal" />
            {data.schedules.length === 0 ? (
              <EmptyState title="Laporan kosong" message="Belum ada absensi sesuai filter." />
            ) : (
              data.schedules.map((row) => (
                <EntityRow
                  key={row.schedule_id}
                  icon="book"
                  title={`${row.subject} · ${row.class.name}`}
                  subtitle={`${row.meeting_count} pertemuan · ${row.detail_count} baris kehadiran · ${row.book}`}
                />
              ))
            )}

            <SectionHeader title="Detail kehadiran" />
            {data.items.map((row) => (
              <EntityRow
                key={`${row.subject_type}-${row.attendance_id}`}
                avatarName={row.subject_name}
                title={row.subject_name}
                subtitle={`${row.subject_type} · ${row.identity_number || 'Tanpa nomor identitas'}`}
                onPress={() => router.push({ pathname: '/report/[id]', params: { id: String(row.meeting_id) } })}
                accessibilityLabel={`Buka detail pertemuan ${row.subject_name}, ${row.attendance_status}`}
                detail={
                  <View style={styles.rinci}>
                    <ThemedText selectable type="caption" themeColor="textSecondary">
                      {row.meeting_date} · {row.subject} · {row.class_name}
                    </ThemedText>
                    <ThemedText selectable type="caption" themeColor="textSecondary">
                      Pencatat: {row.recorder_name ?? '-'} · diperbarui {row.updated_at}
                    </ThemedText>
                  </View>
                }
                pill={
                  <StatusPill
                    label={row.attendance_status}
                    tone={NADA_KEHADIRAN[row.attendance_status] ?? 'neutral'}
                    icon={IKON_KEHADIRAN[row.attendance_status] ?? 'info'}
                  />
                }
              />
            ))}

            {data.pagination.total_pages > 1 ? (
              <View style={styles.pager}>
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
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Layout.screen,
    paddingTop: 8,
    paddingBottom: 60,
    gap: 14,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { flex: 1, minWidth: 135 },
  filterGroup: { gap: 8 },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat: { flexGrow: 1, minWidth: 120, gap: 2 },
  angka: { fontVariant: ['tabular-nums'] },
  rinci: { gap: 2, paddingTop: 2 },
  pager: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  buttonFlex: { flexGrow: 1, flexBasis: 140 },
  pageNumber: { fontVariant: ['tabular-nums'] },
});
