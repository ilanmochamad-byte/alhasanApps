import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
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
import { KeyboardAwareScrollView, KeyboardAwareTextInput } from '@/components/keyboard-aware-scroll-view';
import { ModeSwitcher } from '@/components/mode-switcher';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import {
  bagikanLaporanIzinCsv,
  bagikanLaporanIzinPdf,
  cetakLaporanIzin,
} from '@/report/izin-report-document';

type AksiDokumen = 'cetak' | 'pdf' | 'csv';

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function awalBulan() {
  const date = new Date();
  date.setDate(1);
  return isoDate(date);
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
  const [dari, setDari] = useState(awalBulan());
  const [sampai, setSampai] = useState(isoDate(new Date()));
  const [status, setStatus] = useState<IzinStatus | undefined>();
  const [pencarian, setPencarian] = useState('');
  const [halaman, setHalaman] = useState(1);

  const [terapkan, setTerapkan] = useState<IzinLaporanFilters>({
    date_from: awalBulan(),
    date_to: isoDate(new Date()),
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

  function terapkanFilter() {
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
        await cetakLaporanIzin(filterTerkirim);
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

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
      <Stack.Screen options={{ title: 'Laporan Perizinan' }} />

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
        <ThemedText selectable type="small" themeColor="textSecondary">
          {data.cakupan_label}
        </ThemedText>
      ) : null}

      <View style={[styles.panel, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <ThemedText selectable style={styles.panelTitle}>
          Filter
        </ThemedText>

        <View style={styles.fieldRow}>
          <View style={styles.field}>
            <ThemedText selectable type="small" themeColor="textSecondary">
              Dari tanggal
            </ThemedText>
            <KeyboardAwareTextInput
              value={dari}
              onChangeText={setDari}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            />
          </View>
          <View style={styles.field}>
            <ThemedText selectable type="small" themeColor="textSecondary">
              Sampai tanggal
            </ThemedText>
            <KeyboardAwareTextInput
              value={sampai}
              onChangeText={setSampai}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            />
          </View>
        </View>

        <ThemedText selectable type="small" themeColor="textSecondary">
          Status
        </ThemedText>
        <View style={styles.chipRow}>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: status === undefined }}
            onPress={() => setStatus(undefined)}
            style={[
              styles.chip,
              {
                backgroundColor: status === undefined ? theme.primary : theme.background,
                borderColor: status === undefined ? theme.primary : theme.border,
              },
            ]}>
            <ThemedText
              selectable
              type="small"
              style={{ color: status === undefined ? theme.onPrimary : theme.text }}>
              Semua
            </ThemedText>
          </Pressable>
          {daftarStatus.map((item) => {
            const dipilih = status === item;
            return (
              <Pressable
                key={item}
                accessibilityRole="radio"
                accessibilityState={{ selected: dipilih }}
                onPress={() => setStatus(dipilih ? undefined : item)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: dipilih ? theme.primary : theme.background,
                    borderColor: dipilih ? theme.primary : theme.border,
                  },
                ]}>
                <ThemedText selectable type="small" style={{ color: dipilih ? theme.onPrimary : theme.text }}>
                  {item}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <ThemedText selectable type="small" themeColor="textSecondary">
          Pencarian
        </ThemedText>
        <KeyboardAwareTextInput
          value={pencarian}
          onChangeText={setPencarian}
          placeholder="Nama santri, NIS, atau alasan"
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
        />

        <AppButton label="Terapkan filter" onPress={terapkanFilter} disabled={loading || aksi !== null} />
      </View>

      <View style={styles.actionRow}>
        <View style={styles.actionButton}>
          <AppButton
            label="Cetak"
            variant="secondary"
            loading={aksi === 'cetak'}
            disabled={aksi !== null || loading}
            onPress={() => void jalankanAksi('cetak')}
          />
        </View>
        <View style={styles.actionButton}>
          <AppButton
            label="Bagikan PDF"
            variant="secondary"
            loading={aksi === 'pdf'}
            disabled={aksi !== null || loading}
            onPress={() => void jalankanAksi('pdf')}
          />
        </View>
        <View style={styles.actionButton}>
          <AppButton
            label="Bagikan CSV"
            variant="secondary"
            loading={aksi === 'csv'}
            disabled={aksi !== null || loading}
            onPress={() => void jalankanAksi('csv')}
          />
        </View>
      </View>

      {info ? (
        <ThemedText selectable type="small" themeColor="textSecondary">
          {info}
        </ThemedText>
      ) : null}

      {loading && !data ? (
        <LoadingState label="Memuat laporan…" />
      ) : error && !data ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : data ? (
        <>
          {error ? (
            <ThemedText selectable themeColor="danger" type="small">
              {error}
            </ThemedText>
          ) : null}

          <View style={styles.summaryRow}>
            <Ringkasan label="Total" nilai={String(data.ringkasan.total)} />
            {Object.entries(data.ringkasan.per_status).map(([nama, jumlah]) => (
              <Ringkasan key={nama} label={nama} nilai={String(jumlah)} />
            ))}
          </View>

          <View style={[styles.panel, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <ThemedText selectable style={styles.panelTitle}>
              Durasi keputusan
            </ThemedText>
            <ThemedText selectable type="smallBold">
              Median: {data.durasi.median_label}
            </ThemedText>
            <ThemedText selectable type="small" themeColor="textSecondary">
              Tercepat {data.durasi.min_label} · Terlama {data.durasi.maks_label} · Rata-rata {data.durasi.rata_label}
            </ThemedText>
            <ThemedText selectable type="small" themeColor="textSecondary">
              Dihitung dari {data.durasi.jumlah} keputusan yang memiliki waktu pengajuan dan waktu keputusan.
            </ThemedText>
          </View>

          {data.items.length === 0 ? (
            <EmptyState
              title="Tidak ada data"
              message="Tidak ada pengajuan yang cocok dengan filter dalam cakupan Anda."
            />
          ) : (
            data.items.map((baris) => (
              <View
                key={baris.id}
                style={[styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <ThemedText selectable type="smallBold">
                  #{baris.id} · {baris.nama_santri}
                </ThemedText>
                <ThemedText selectable type="small" themeColor="textSecondary">
                  {baris.nis} · {baris.kamar_kelas_label} · {baris.sumber_label}
                </ThemedText>
                <ThemedText selectable type="small">
                  {baris.tgl_izin} → {baris.tgl_kembali} · {baris.status}
                </ThemedText>
                <ThemedText selectable type="small" themeColor="textSecondary">
                  Pengurus: {baris.pengurus_label} · Murobi: {baris.murobi_label}
                </ThemedText>
                <ThemedText selectable type="small" themeColor="textSecondary">
                  Keputusan: {baris.keputusan_label} · Durasi: {baris.durasi_label}
                </ThemedText>
              </View>
            ))
          )}

          {data.pagination.total_pages > 1 ? (
            <View style={styles.pagerRow}>
              <View style={styles.pagerButton}>
                <AppButton
                  label="Sebelumnya"
                  variant="secondary"
                  disabled={data.pagination.current_page <= 1 || aksi !== null}
                  onPress={() => setHalaman((current) => Math.max(1, current - 1))}
                />
              </View>
              <ThemedText selectable type="small" themeColor="textSecondary">
                Halaman {data.pagination.current_page} dari {data.pagination.total_pages}
              </ThemedText>
              <View style={styles.pagerButton}>
                <AppButton
                  label="Berikutnya"
                  variant="secondary"
                  disabled={data.pagination.current_page >= data.pagination.total_pages || aksi !== null}
                  onPress={() => setHalaman((current) => current + 1)}
                />
              </View>
            </View>
          ) : null}
        </>
      ) : null}
    </KeyboardAwareScrollView>
  );
}

function Ringkasan({ label, nilai }: { label: string; nilai: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.summaryChip, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <ThemedText selectable type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText selectable type="smallBold">
        {nilai}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 120, gap: 14, maxWidth: 760, width: '100%', alignSelf: 'center' },
  panel: { borderWidth: 1, borderRadius: 18, borderCurve: 'continuous', padding: 16, gap: 10 },
  panelTitle: { fontSize: 17, fontWeight: '800' },
  fieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  field: { flexGrow: 1, flexBasis: 150, gap: 5 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 15 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionButton: { flexGrow: 1, flexBasis: 150 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryChip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 7, minWidth: 92 },
  row: { borderWidth: 1, borderRadius: 16, borderCurve: 'continuous', padding: 14, gap: 4 },
  pagerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 6 },
  pagerButton: { flexShrink: 1, minWidth: 128 },
});
