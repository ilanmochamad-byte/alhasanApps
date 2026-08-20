import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { actionableError, api } from '@/api/client';
import type { TodayResponse } from '@/api/types';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { ScheduleCard, formatDate } from '@/components/schedule-card';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { profile, logout } = useAuth();
  const [data, setData] = useState<TodayResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try { setData(await api.today()); } catch (caught) { setError(actionableError(caught)); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  function openSchedule(schedule: TodayResponse['schedules'][number]) {
    router.push({ pathname: '/schedule/[id]', params: { id: String(schedule.id), date: schedule.occurrence_date } });
  }

  function confirmLogout() {
    if (process.env.EXPO_OS === 'web') {
      if (globalThis.confirm('Keluar dari aplikasi? Token sesi di server dan perangkat akan dicabut.')) void logout();
      return;
    }
    Alert.alert('Keluar dari aplikasi?', 'Token sesi di server dan perangkat akan dicabut.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: () => void logout() },
    ]);
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.primary} />}>
      <View style={[styles.welcome, { backgroundColor: theme.primary }]}><ThemedText selectable style={[styles.greeting, { color: theme.onPrimary }]}>Assalamu’alaikum, {profile?.guru?.name ?? profile?.name}</ThemedText><ThemedText selectable style={{ color: theme.onPrimary }}>Semoga tugas pengajian hari ini dimudahkan.</ThemedText></View>
      {loading && !data ? <LoadingState label="Memuat jadwal hari ini…" /> : error && !data ? <ErrorState message={error} onRetry={() => void load()} /> : data ? <>
        <View style={styles.section}><ThemedText selectable style={styles.sectionTitle}>Jadwal hari ini</ThemedText><ThemedText selectable themeColor="textSecondary">{formatDate(data.date)}</ThemedText></View>
        {data.schedules.length === 0 ? <EmptyState title="Tidak ada jadwal hari ini" message="Jadwal berikutnya akan ditampilkan di bawah." /> : data.schedules.map((schedule) => <ScheduleCard key={`${schedule.id}-${schedule.occurrence_date}`} schedule={schedule} onPress={() => openSchedule(schedule)} />)}
        <View style={styles.section}><ThemedText selectable style={styles.sectionTitle}>Jadwal berikutnya</ThemedText></View>
        {data.next_schedule ? <ScheduleCard schedule={data.next_schedule} onPress={() => openSchedule(data.next_schedule!)} /> : <EmptyState title="Belum ada jadwal mendatang" message="Tarik ke bawah untuk memuat ulang." />}
      </> : null}
      <View style={[styles.account, { borderColor: theme.border }]}><ThemedText selectable type="small" themeColor="textSecondary">Masuk sebagai @{profile?.username}</ThemedText><AppButton label="Keluar" onPress={confirmLogout} variant="secondary" /></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 110, gap: 14, maxWidth: 760, width: '100%', alignSelf: 'center' },
  welcome: { padding: 20, borderRadius: 22, borderCurve: 'continuous', gap: 7 },
  greeting: { fontSize: 21, lineHeight: 27, fontWeight: '900' },
  section: { paddingTop: 10, gap: 2 },
  sectionTitle: { fontSize: 20, fontWeight: '900' },
  account: { borderTopWidth: 1, paddingTop: 20, marginTop: 14, gap: 12 },
});
