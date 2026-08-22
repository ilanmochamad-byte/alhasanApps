import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, StyleSheet, TextInput, View } from 'react-native';

import { actionableError, api } from '@/api/client';
import type { ScheduleListResponse } from '@/api/types';
import { AppButton } from '@/components/app-button';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import { ScheduleCard } from '@/components/schedule-card';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function SchedulesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const today = new Date();
  const later = new Date(); later.setDate(today.getDate() + 30);
  const [from, setFrom] = useState(isoDate(today));
  const [to, setTo] = useState(isoDate(later));
  const [applied, setApplied] = useState({ from: isoDate(today), to: isoDate(later) });
  const [data, setData] = useState<ScheduleListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try { setData(await api.schedules(applied.from, applied.to)); } catch (caught) { setError(actionableError(caught)); }
    finally { setLoading(false); setRefreshing(false); }
  }, [applied]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <KeyboardAwareScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.primary} />}>
      <View style={[styles.filter, { backgroundColor: theme.card, borderColor: theme.border }]}><ThemedText selectable style={styles.filterTitle}>Filter tanggal</ThemedText><View style={styles.filterRow}><View style={styles.field}><ThemedText selectable type="smallBold">Dari</ThemedText><TextInput value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" placeholderTextColor={theme.textSecondary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} /></View><View style={styles.field}><ThemedText selectable type="smallBold">Sampai</ThemedText><TextInput value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" placeholderTextColor={theme.textSecondary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} /></View></View><AppButton label="Terapkan filter" onPress={() => setApplied({ from: from.trim(), to: to.trim() })} /></View>
      {loading && !data ? <LoadingState label="Memuat daftar jadwal…" /> : error && !data ? <ErrorState message={error} onRetry={() => void load()} /> : data?.items.length === 0 ? <EmptyState title="Jadwal tidak ditemukan" message="Ubah rentang tanggal atau tarik ke bawah untuk memuat ulang." /> : data ? <><ThemedText selectable themeColor="textSecondary">{data.pagination.total} tugas ditemukan</ThemedText>{data.items.map((schedule) => <ScheduleCard key={`${schedule.id}-${schedule.occurrence_date}`} schedule={schedule} onPress={() => router.push({ pathname: '/schedule/[id]', params: { id: String(schedule.id), date: schedule.occurrence_date } })} />)}</> : null}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 110, gap: 14, maxWidth: 760, width: '100%', alignSelf: 'center' },
  filter: { borderWidth: 1, borderRadius: 18, borderCurve: 'continuous', padding: 16, gap: 14 },
  filterTitle: { fontSize: 18, fontWeight: '900' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { flex: 1, minWidth: 135, gap: 6 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 15 },
});
