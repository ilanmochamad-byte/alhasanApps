import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, useWindowDimensions, View } from 'react-native';

import { actionableError, api } from '@/api/client';
import type {
  IzinCapability,
  IzinLaporanFilters,
  IzinLaporanOptions,
  IzinLaporanResponse,
  IzinStatus,
} from '@/api/types';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import type { IconName } from '@/components/app-icon';
import { statusIcon, statusPillTone } from '@/components/izin-card';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import { ModeSwitcher } from '@/components/mode-switcher';
import { StackScreen } from '@/components/screen-shell';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { ActionBar } from '@/components/ui/action-bar';
import { Chip, ChipRow } from '@/components/ui/chip';
import { DateField } from '@/components/ui/date-field';
import { EntityRow } from '@/components/ui/entity-row';
import { Notice } from '@/components/ui/notice';
import { SearchBar } from '@/components/ui/search-bar';
import { StatGrid, type StatTone } from '@/components/ui/stat-card';
import { StatusPill } from '@/components/ui/status-pill';
import { Overline, Panel } from '@/components/ui/surface';
import { Layout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatPendek, isoAwalBulan, isoHariIni } from '@/lib/date';
import {
  bagikanLaporanIzinCsv,
  bagikanLaporanIzinPdf,
  cetakLaporanIzin,
} from '@/report/izin-report-document';

type AksiDokumen = 'cetak' | 'pdf' | 'csv';

const JUDUL = 'Laporan perizinan';

/** Ikon dan nada kartu angka per status; label dan angkanya dari server. */
function tampilanStatus(nama: string): { icon: IconName; tone: StatTone } {
  const nada = statusPillTone(nama as IzinStatus);
  return {
    icon: statusIcon(nama as IzinStatus),
    tone: nada === 'success' ? 'primary' : nada === 'danger' ? 'danger' : nada === 'neutral' ? 'info' : 'warning',
  };
}



/**
 * Laporan perizinan pada aplikasi (PRD V2 Fase 5 §2 dan §4).
 *
 * Layar ini TIDAK menghitung ringkasan, total, atau median sendiri, dan tidak
 * menyaring baris di sisi klien. Seluruh angka dan pembatasan cakupan berasal
 * dari `/izin/laporan` — endpoint yang sama dengan website. Dengan begitu:
 *
 *   - total ringkasan, detail, cetak, PDF, dan CSV konsisten untuk filter yang
 *     sama, baik dibuka dari aplikasi maupun dari website;
 *   - aturan otorisasi tidak diduplikasi di sini. `mode` hanya preferensi
 *     tampilan; server menghitung ulang kemampuan akun pada setiap permintaan
 *     dan mengabaikan mode yang tidak dimiliki.
 */
export default function LaporanIzinScreen() {
  const { profile } = useAuth();
  const { fontScale } = useWindowDimensions();

  // Key mengikuti identitas dan skala teks, sama seperti layar perizinan, agar
  // data akun sebelumnya tidak terbawa dan Dynamic Type menghitung ulang layout.
  return <LaporanIzinSession key={`${profile?.id ?? 'guest'}:${fontScale}`} />;
}

function LaporanIzinSession() {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const teksBesar = fontScale > 1.35;
  const { capabilities } = useAuth();
  const params = useLocalSearchParams<{ mode?: string }>();

  const modes = capabilities.list;
  // Mode dari parameter rute hanya dipakai bila akun MEMANG memilikinya.
  // Ini murni kenyamanan navigasi; server tetap menolak cakupan yang tidak
  // dimiliki, sehingga parameter palsu tidak pernah memperluas akses.
  const modeAwal = modes.includes(params.mode as IzinCapability)
    ? (params.mode as IzinCapability)
    : capabilities.default_mode;
  const [mode, setMode] = useState<IzinCapability | null>(modeAwal);
  const [dari, setDari] = useState(isoAwalBulan());
  const [sampai, setSampai] = useState(isoHariIni());
  const [status, setStatus] = useState<IzinStatus | undefined>();
  const [pencarian, setPencarian] = useState('');
  const [halaman, setHalaman] = useState(1);

  const [terapkan, setTerapkan] = useState<IzinLaporanFilters>({
    date_from: isoAwalBulan(),
    date_to: isoHariIni(),
  });

  const [data, setData] = useState<IzinLaporanResponse | null>(null);
  const [pilihan, setPilihan] = useState<IzinLaporanOptions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aksi, setAksi] = useState<AksiDokumen | null>(null);

  const modeAktif = mode ?? capabilities.default_mode ?? undefined;

  // Dimemo agar identitasnya stabil antar render: tanpa ini `load` akan dibuat
  // ulang setiap render dan `useFocusEffect` akan memuat ulang tanpa henti.
  const filterTerkirim = useMemo<IzinLaporanFilters>(
    () => ({ ...terapkan, mode: modeAktif }),
    [terapkan, modeAktif],
  );

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const [laporan, opsi] = await Promise.all([
          api.izinLaporan(filterTerkirim, halaman, 20),
          api.izinLaporanOptions({ mode: modeAktif }),
        ]);
        setData(laporan);
        setPilihan(opsi);
      } catch (caught) {
        setError(actionableError(caught));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filterTerkirim, halaman, modeAktif],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function terapkanFilter(tutup?: () => void) {
    tutup?.();
    setHalaman(1);
    setInfo(null);
    setTerapkan({
      date_from: dari.trim(),
      date_to: sampai.trim(),
      status,
      q: pencarian.trim() === '' ? undefined : pencarian.trim(),
    });
  }

  async function jalankanAksi(pilihanAksi: AksiDokumen) {
    setAksi(pilihanAksi);
    setError(null);
    setInfo(null);
    try {
      if (pilihanAksi === 'cetak') {
        const hasil = await cetakLaporanIzin(filterTerkirim);
        if (hasil === 'dibatalkan') setInfo('Pencetakan dibatalkan.');
      } else if (pilihanAksi === 'pdf') {
        await bagikanLaporanIzinPdf(filterTerkirim);
      } else {
        const baris = await bagikanLaporanIzinCsv(filterTerkirim);
        setInfo(`CSV berisi ${baris} baris — seluruh hasil filter, bukan hanya halaman ini.`);
      }
    } catch (caught) {
      setError(actionableError(caught));
    } finally {
      setAksi(null);
    }
  }

  const daftarStatus: IzinStatus[] = pilihan?.status ?? [];

  const saringanAktif = status !== undefined || terapkan.status !== undefined;
  const tombolDokumen = (
    <>
      <AppButton
        label="Cetak"
        icon="printer"
        variant="secondary"
        size="sm"
        style={teksBesar ? undefined : styles.tombolDokumen}
        loading={aksi === 'cetak'}
        disabled={aksi !== null || loading}
        onPress={() => void jalankanAksi('cetak')}
      />
      <AppButton
        label="Bagikan PDF"
        variant="secondary"
        size="sm"
        style={teksBesar ? undefined : styles.tombolDokumen}
        loading={aksi === 'pdf'}
        disabled={aksi !== null || loading}
        onPress={() => void jalankanAksi('pdf')}
      />
      <AppButton
        label="Bagikan CSV"
        variant="secondary"
        size="sm"
        style={teksBesar ? undefined : styles.tombolDokumen}
        loading={aksi === 'csv'}
        disabled={aksi !== null || loading}
        onPress={() => void jalankanAksi('csv')}
      />
    </>
  );

  return (
    <StackScreen title={JUDUL}>
      <KeyboardAwareScrollView
        contentInsetAdjustmentBehavior="never"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.primary} />}>
        <ModeSwitcher
          modes={modes}
          value={modeAktif ?? null}
          disabled={loading || aksi !== null}
          onChange={(pilih) => {
            setMode(pilih);
            setHalaman(1);
            setInfo(null);
          }}
        />

        {data ? (
          <ThemedText selectable type="caption" themeColor="textSecondary">
            {data.cakupan_label}
          </ThemedText>
        ) : null}

        <SearchBar
          accessibilityLabel="Cari dalam laporan"
          value={pencarian}
          onChangeText={setPencarian}
          placeholder="Nama santri, NIS, atau alasan"
          onSubmitEditing={() => terapkanFilter()}
          filterTitle="Filter"
          filterActive={saringanAktif}
          trailing={
            pencarian.trim() !== (terapkan.q ?? '') ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Terapkan pencarian"
                onPress={() => terapkanFilter()}
                hitSlop={8}
                style={styles.terapkan}>
                <ThemedText selectable type="label" themeColor="primary">
                  Terapkan
                </ThemedText>
              </Pressable>
            ) : null
          }
          filter={(tutup) => (
            <>
              <View style={styles.fieldRow}>
                <View style={styles.field}>
                  <DateField label="Dari tanggal" value={dari} onChange={setDari} maximumDate={sampai} />
                </View>
                <View style={styles.field}>
                  <DateField label="Sampai tanggal" value={sampai} onChange={setSampai} minimumDate={dari} />
                </View>
              </View>

              <ThemedText selectable type="label">
                Status
              </ThemedText>
              <View accessibilityRole="radiogroup" accessibilityLabel="Saring menurut status">
                <ChipRow>
                  <Chip accessibilityRole="radio" label="Semua" selected={status === undefined} style={styles.pilihan} onPress={() => setStatus(undefined)} />
                  {daftarStatus.map((item) => (
                    <Chip
                      key={item}
                      accessibilityRole="radio"
                      label={item}
                      selected={status === item}
                      style={styles.pilihan}
                      onPress={() => setStatus(status === item ? undefined : item)}
                    />
                  ))}
                </ChipRow>
              </View>

              <AppButton label="Terapkan filter" onPress={() => terapkanFilter(tutup)} disabled={loading || aksi !== null} />
            </>
          )}
        />

        {/* Saringan yang sedang berlaku (dari `terapkan`, bukan draf). */}
        <ChipRow>
          <Chip icon="calendar" label={`${formatPendek(terapkan.date_from ?? '')} – ${formatPendek(terapkan.date_to ?? '')}`} />
          <Chip label={terapkan.status ?? 'Semua status'} />
        </ChipRow>

        {teksBesar ? <View style={styles.dokumenBertumpuk}>{tombolDokumen}</View> : null}

        <Notice tone="neutral" text={info} />

        {loading && !data ? (
          <LoadingState label="Memuat laporan…" />
        ) : error && !data ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : data ? (
          <>
            <Notice tone="danger" text={error} />

            {/* Angka per status dari ringkasan server untuk filter yang sama. */}
            <StatGrid
              items={[
                { icon: 'izin', value: String(data.ringkasan.total), label: 'Total', tone: 'primary' },
                ...Object.entries(data.ringkasan.per_status).map(([nama, jumlah]) => ({
                  ...tampilanStatus(nama),
                  value: String(jumlah),
                  label: nama,
                })),
              ]}
            />

            <Panel>
              <Overline>Durasi keputusan</Overline>
              <ThemedText selectable type="bodyBold">
                Median: {data.durasi.median_label}
              </ThemedText>
              <ThemedText selectable type="caption" themeColor="textSecondary">
                Tercepat {data.durasi.min_label} · Terlama {data.durasi.maks_label} · Rata-rata {data.durasi.rata_label}
              </ThemedText>
              <ThemedText selectable type="caption" themeColor="textSecondary">
                Dihitung dari {data.durasi.jumlah} keputusan yang memiliki waktu pengajuan dan waktu keputusan.
              </ThemedText>
            </Panel>

            {data.items.length === 0 ? (
              <EmptyState
                title="Tidak ada data"
                message="Tidak ada pengajuan yang cocok dengan filter dalam cakupan Anda."
              />
            ) : (
              data.items.map((baris) => (
                <EntityRow
                  key={baris.id}
                  avatarName={baris.nama_santri}
                  title={`#${baris.id} · ${baris.nama_santri}`}
                  subtitle={`${baris.nis} · ${baris.kamar_kelas_label} · ${baris.sumber_label}`}
                  detail={
                    <View style={styles.rinci}>
                      <ThemedText selectable type="caption">
                        {baris.tgl_izin} → {baris.tgl_kembali}
                      </ThemedText>
                      <ThemedText selectable type="caption" themeColor="textSecondary">
                        Pengurus: {baris.pengurus_label} · Murobi: {baris.murobi_label}
                      </ThemedText>
                      <ThemedText selectable type="caption" themeColor="textSecondary">
                        Keputusan: {baris.keputusan_label} · Durasi: {baris.durasi_label}
                      </ThemedText>
                    </View>
                  }
                  pill={<StatusPill label={baris.status} tone={statusPillTone(baris.status)} icon={statusIcon(baris.status)} />}
                />
              ))
            )}

            {data.pagination.total_pages > 1 ? (
              <View style={styles.pagerRow}>
                <View style={styles.pagerButton}>
                  <AppButton
                    label="Sebelumnya"
                    variant="secondary"
                    size="sm"
                    disabled={data.pagination.current_page <= 1 || aksi !== null}
                    onPress={() => setHalaman((current) => Math.max(1, current - 1))}
                  />
                </View>
                <ThemedText selectable type="caption" themeColor="textSecondary">
                  Halaman {data.pagination.current_page} dari {data.pagination.total_pages}
                </ThemedText>
                <View style={styles.pagerButton}>
                  <AppButton
                    label="Berikutnya"
                    variant="secondary"
                    size="sm"
                    disabled={data.pagination.current_page >= data.pagination.total_pages || aksi !== null}
                    onPress={() => setHalaman((current) => current + 1)}
                  />
                </View>
              </View>
            ) : null}
          </>
        ) : null}
      </KeyboardAwareScrollView>

      {teksBesar ? null : <ActionBar>{tombolDokumen}</ActionBar>}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Layout.screen, paddingTop: 12, paddingBottom: 40, gap: 14, maxWidth: 760, width: '100%', alignSelf: 'center' },
  fieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  field: { flexGrow: 1, flexBasis: 150, gap: 5 },
  pilihan: { minHeight: 44 },
  terapkan: { minHeight: 44, justifyContent: 'center' },
  tombolDokumen: { flex: 1 },
  dokumenBertumpuk: { gap: 8 },
  rinci: { gap: 2, paddingTop: 2 },
  pagerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 6 },
  pagerButton: { flexShrink: 1, minWidth: 124 },
});
