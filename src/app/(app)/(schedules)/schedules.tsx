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
import { Field } from '@/components/ui/app-field';
import { Chip, ChipRow } from '@/components/ui/chip';
import { Overline, Panel } from '@/components/ui/surface';
import { useTheme } from '@/hooks/use-theme';

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function tambahHari(jumlah: number) {
  const date = new Date();
  date.setDate(date.getDate() + jumlah);
  return isoDate(date);
}

type Preset = 'pekan' | 'bulan' | 'kustom';

export default function SchedulesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const awal = useMemo(() => ({ from: isoDate(new Date()), to: tambahHari(30) }), []);
  const [preset, setPreset] = useState<Preset>('bulan');
  const [from, setFrom] = useState(awal.from);
  const [to, setTo] = useState(awal.to);
  const [applied, setApplied] = useState(awal);
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

  /**
   * Pratinjau rentang menggantikan dua kolom teks YYYY-MM-DD sebagai jalan
   * utama. Kolom teksnya tetap ada di bawah "Kustom" — parameter yang dikirim
   * ke server persis sama.
   */
  function pilihPreset(next: Preset) {
    setPreset(next);
    if (next === 'kustom') return;
    const rentang = next === 'pekan'
      ? { from: isoDate(new Date()), to: tambahHari(7) }
      : { from: isoDate(new Date()), to: tambahHari(30) };
    setFrom(rentang.from);
    setTo(rentang.to);
    setApplied(rentang);
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
        <Chip label="7 hari" selected={preset === 'pekan'} onPress={() => pilihPreset('pekan')} />
        <Chip label="30 hari" selected={preset === 'bulan'} onPress={() => pilihPreset('bulan')} />
        <Chip
          label="Kustom"
          icon="calendar"
          selected={preset === 'kustom'}
          onPress={() => pilihPreset('kustom')}
        />
      </ChipRow>

      {preset === 'kustom' ? (
        <Panel>
          <Overline>Rentang tanggal</Overline>
          <View style={styles.filterRow}>
            <View style={styles.field}>
              <Field label="Dari" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" />
            </View>
            <View style={styles.field}>
              <Field label="Sampai" value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" />
            </View>
          </View>
          <AppButton
            label="Terapkan filter"
            onPress={() => setApplied({ from: from.trim(), to: to.trim() })}
          />
        </Panel>
      ) : null}

      {loading && !data ? (
        <LoadingState label="Memuat daftar jadwal…" />
      ) : error && !data ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : data?.items.length === 0 ? (
        <EmptyState
          title="Jadwal tidak ditemukan"
          message="Ubah rentang tanggal atau tarik ke bawah untuk memuat ulang."
        />
      ) : data ? (
        <>
          <ThemedText selectable type="caption" themeColor="textSecondary">
            {data.pagination.total} tugas ditemukan
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
                  onPress={() =>
                    router.push({
                      pathname: '/schedule/[id]',
                      params: { id: String(schedule.id), date: schedule.occurrence_date },
                    })
                  }
                />
              ))}
            </View>
          ))}
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
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { flex: 1, minWidth: 135 },
  group: { gap: 10 },
  groupHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
});
