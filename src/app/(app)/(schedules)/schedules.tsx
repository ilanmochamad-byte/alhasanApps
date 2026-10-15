import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { actionableError, api } from '@/api/client';
import type { ScheduleListResponse, ScheduleOccurrence } from '@/api/types';
import { AppButton } from '@/components/app-button';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import { ScheduleCard, formatDateShort } from '@/components/schedule-card';
import { ScreenHeader } from '@/components/screen-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { DateField } from '@/components/ui/date-field';
import { Chip, ChipRow } from '@/components/ui/chip';
import { Overline, Panel } from '@/components/ui/surface';
import { WeekStrip } from '@/components/ui/week-strip';
import { useTheme } from '@/hooks/use-theme';
import { isoHariIni, isoTambahHari } from '@/lib/date';
import { hariPekan } from '@/lib/week';

/**
 * Redesain tampilan Fase 2: tampilan utama adalah satu pekan (deretan tanggal
 * dari Konsep B) dengan daftar sesi tanggal terpilih. Rentang kustom tetap
 * tersedia untuk melihat banyak hari sekaligus; parameter API tidak berubah.
 */
type Tampilan = 'pekan' | 'kustom';

export default function SchedulesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const hariIni = useMemo(() => isoHariIni(), []);
  const [tampilan, setTampilan] = useState<Tampilan>('pekan');
  const [tanggal, setTanggal] = useState(hariIni);
  const [from, setFrom] = useState(hariIni);
  const [to, setTo] = useState(() => isoTambahHari(30));
  const [kustom, setKustom] = useState({ from: hariIni, to: isoTambahHari(30) });
  const pekan = hariPekan(tanggal);
  const awalPekan = pekan[0];
  const akhirPekan = pekan[6];
  // Rentang yang dimuat: satu pekan penuh (Senin–Minggu) dari tanggal
  // terpilih, atau rentang kustom yang sudah diterapkan. Bergantung pada
  // string batas pekan, sehingga memilih tanggal lain dalam pekan yang sama
  // tidak memuat ulang dari server.
  const applied = useMemo(
    () => (tampilan === 'pekan' ? { from: awalPekan, to: akhirPekan } : kustom),
    [tampilan, awalPekan, akhirPekan, kustom],
  );
  const [data, setData] = useState<ScheduleListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        setData(await api.schedules(applied.from, applied.to));
      } catch (caught) {
        setError(actionableError(caught));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [applied],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function bukaJadwal(schedule: ScheduleOccurrence) {
    router.push({
      pathname: '/schedule/[id]',
      params: { id: String(schedule.id), date: schedule.occurrence_date },
    });
  }

  // Mengelompokkan hasil per tanggal supaya daftar panjang tetap terbaca.
  const kelompok = useMemo(() => {
    if (!data) return [] as { tanggal: string; items: ScheduleOccurrence[] }[];
    const peta = new Map<string, ScheduleOccurrence[]>();
    for (const item of data.items) {
      const daftar = peta.get(item.occurrence_date) ?? [];
      daftar.push(item);
      peta.set(item.occurrence_date, daftar);
    }
    return [...peta.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tanggal, items]) => ({ tanggal, items }));
  }, [data]);

  const sesiTerpilih = useMemo(
    () => data?.items.filter((item) => item.occurrence_date === tanggal) ?? [],
    [data, tanggal],
  );
  // Hasil pekan lama tetap tampil selama pekan baru dimuat; jangan sampai
  // daftar tanggal terpilih diisi data pekan sebelumnya.
  const dataSesuai =
    data?.filters.date_from === applied.from && data?.filters.date_to === applied.to ? data : null;

  return (
    <KeyboardAwareScrollView
      contentInsetAdjustmentBehavior="never"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.primary} />
      }>
      <ScreenHeader title="Jadwal" />

      <ChipRow>
        <Chip
          label="Per pekan"
          accessibilityRole="radio"
          selected={tampilan === 'pekan'}
          onPress={() => setTampilan('pekan')}
        />
        <Chip
          label="Rentang kustom"
          icon="calendar"
          accessibilityRole="radio"
          selected={tampilan === 'kustom'}
          onPress={() => setTampilan('kustom')}
        />
      </ChipRow>

      {tampilan === 'pekan' ? <WeekStrip value={tanggal} onChange={setTanggal} today={hariIni} /> : null}

      {tampilan === 'kustom' ? (
        <Panel>
          <Overline>Rentang tanggal</Overline>
          <View style={styles.filterRow}>
            <View style={styles.field}>
              <DateField label="Dari" value={from} onChange={setFrom} maximumDate={to} />
            </View>
            <View style={styles.field}>
              <DateField label="Sampai" value={to} onChange={setTo} minimumDate={from} />
            </View>
          </View>
          <AppButton
            label="Terapkan filter"
            onPress={() => setKustom({ from: from.trim(), to: to.trim() })}
          />
        </Panel>
      ) : null}

      {loading && !dataSesuai ? (
        <LoadingState label="Memuat daftar jadwal…" />
      ) : error && !dataSesuai ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : !dataSesuai ? null : tampilan === 'pekan' ? (
        <View style={styles.group}>
          <ThemedText selectable type="overline" themeColor="textSecondary">
            {formatDateShort(tanggal).toUpperCase()} · {sesiTerpilih.length} SESI
          </ThemedText>
          {sesiTerpilih.length === 0 ? (
            <EmptyState
              title="Tidak ada sesi"
              message="Pilih tanggal lain atau geser ke pekan berikutnya."
            />
          ) : (
            sesiTerpilih.map((schedule) => (
              <ScheduleCard
                key={`${schedule.id}-${schedule.occurrence_date}`}
                schedule={schedule}
                hideDate
                today={hariIni}
                onPress={() => bukaJadwal(schedule)}
              />
            ))
          )}
          {dataSesuai.pagination.total > dataSesuai.items.length ? (
            <ThemedText selectable type="caption" themeColor="warning">
              Pekan ini memuat lebih dari {dataSesuai.items.length} sesi; sebagian tidak ditampilkan.
              Gunakan rentang kustom yang lebih pendek.
            </ThemedText>
          ) : null}
        </View>
      ) : dataSesuai.items.length === 0 ? (
        <EmptyState
          title="Jadwal tidak ditemukan"
          message="Ubah rentang tanggal atau tarik ke bawah untuk memuat ulang."
        />
      ) : (
        <>
          <ThemedText selectable type="caption" themeColor="textSecondary">
            {dataSesuai.pagination.total} tugas ditemukan
          </ThemedText>
          {kelompok.map((grup) => (
            <View key={grup.tanggal} style={styles.group}>
              <View style={styles.groupHeader}>
                <Overline>{formatDateShort(grup.tanggal)}</Overline>
                <ThemedText selectable type="caption" themeColor="textMuted">
                  {grup.items.length} sesi
                </ThemedText>
              </View>
              {grup.items.map((schedule) => (
                <ScheduleCard
                  key={`${schedule.id}-${schedule.occurrence_date}`}
                  schedule={schedule}
                  hideDate
                  today={hariIni}
                  onPress={() => bukaJadwal(schedule)}
                />
              ))}
            </View>
          ))}
        </>
      )}
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
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { flex: 1, minWidth: 135 },
  group: { gap: 10 },
  groupHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
});
