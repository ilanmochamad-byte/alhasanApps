import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { actionableError, api } from '@/api/client';
import type { ScheduleOccurrence, TodayResponse } from '@/api/types';
import { useAuth } from '@/auth/auth-context';
import { AppIcon, type IconName } from '@/components/app-icon';
import { BrandHeader, Greeting } from '@/components/screen-header';
import { ScheduleCard, formatDate } from '@/components/schedule-card';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { SectionHeader } from '@/components/ui/surface';
import { Elevation, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function tanggalHariIni() {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { profile, capabilities } = useAuth();
  const [data, setData] = useState<TodayResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Akun pengurus dan orang tua tidak memiliki akses jadwal V1. Beranda mereka
  // tidak boleh memanggil endpoint jadwal (yang akan dijawab 403 oleh server)
  // dan langsung menawarkan menu perizinan sesuai kemampuannya.
  const roles = profile?.roles ?? [];
  const aksesJadwal = roles.includes('guru') || roles.includes('admin');
  const adaPerizinan = capabilities.list.length > 0;

  const load = useCallback(
    async (refresh = false) => {
      if (!aksesJadwal) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        setData(await api.today());
      } catch (caught) {
        setError(actionableError(caught));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [aksesJadwal],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function openSchedule(schedule: ScheduleOccurrence) {
    router.push({
      pathname: '/schedule/[id]',
      params: { id: String(schedule.id), date: schedule.occurrence_date },
    });
  }

  // Kartu sorot menunjuk satu tugas: sesi hari ini yang pertama kali belum
  // selesai, atau — bila hari ini kosong — jadwal berikutnya.
  const sorot =
    data?.schedules.find((item) => item.meeting?.status !== 'Selesai') ??
    data?.schedules[0] ??
    data?.next_schedule ??
    null;
  const sorotHariIni = Boolean(sorot && data?.schedules.some((item) => item.id === sorot.id));

  const aksiCepat: { icon: IconName; label: string; onPress: () => void }[] = [
    ...(aksesJadwal
      ? [
          { icon: 'calendar' as IconName, label: 'Jadwal', onPress: () => router.push('/schedules') },
        ]
      : []),
    ...(adaPerizinan
      ? [{ icon: 'izin' as IconName, label: 'Perizinan', onPress: () => router.push('/perizinan') }]
      : []),
    ...(aksesJadwal
      ? [{ icon: 'chart' as IconName, label: 'Laporan', onPress: () => router.push('/reports') }]
      : []),
    ...(adaPerizinan
      ? [
          {
            icon: 'printer' as IconName,
            label: 'Laporan izin',
            onPress: () => router.push({ pathname: '/izin/laporan', params: { mode: capabilities.default_mode ?? '' } }),
          },
        ]
      : []),
  ];

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.primary} />
      }>
      <BrandHeader />
      <Greeting name={profile?.guru?.name ?? profile?.name ?? ''} date={tanggalHariIni()} />

      {sorot ? (
        <HeroSession
          schedule={sorot}
          hariIni={sorotHariIni}
          onPress={() => openSchedule(sorot)}
        />
      ) : adaPerizinan ? (
        <HeroPerizinan
          jumlahCakupan={capabilities.list.length}
          onPress={() => router.push('/perizinan')}
        />
      ) : null}

      {aksiCepat.length > 0 ? (
        <View style={styles.quickRow}>
          {aksiCepat.map((aksi) => (
            <Pressable
              key={aksi.label}
              accessibilityRole="button"
              accessibilityLabel={aksi.label}
              onPress={aksi.onPress}
              style={({ pressed }) => [
                styles.quickTile,
                { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.75 : 1 },
              ]}>
              <AppIcon name={aksi.icon} size={22} themeColor="primary" />
              <ThemedText selectable style={styles.quickLabel} numberOfLines={1}>
                {aksi.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}

      {!aksesJadwal ? (
        <ThemedText selectable type="caption" themeColor="textSecondary">
          Akun ini tidak memiliki jadwal mengajar, sehingga menu jadwal dan laporan tidak ditampilkan.
        </ThemedText>
      ) : loading && !data ? (
        <LoadingState label="Memuat jadwal hari ini…" />
      ) : error && !data ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : data ? (
        <>
          <SectionHeader
            title="Jadwal hari ini"
            trailing={
              <ThemedText selectable type="caption" themeColor="textSecondary">
                {formatDate(data.date)}
              </ThemedText>
            }
          />
          {data.schedules.length === 0 ? (
            <EmptyState
              title="Tidak ada jadwal hari ini"
              message="Jadwal berikutnya akan ditampilkan di bawah."
            />
          ) : (
            data.schedules.map((schedule) => (
              <ScheduleCard
                key={`${schedule.id}-${schedule.occurrence_date}`}
                schedule={schedule}
                hideDate
                onPress={() => openSchedule(schedule)}
              />
            ))
          )}

          <SectionHeader title="Jadwal berikutnya" />
          {data.next_schedule ? (
            <ScheduleCard schedule={data.next_schedule} onPress={() => openSchedule(data.next_schedule!)} />
          ) : (
            <EmptyState title="Belum ada jadwal mendatang" message="Tarik ke bawah untuk memuat ulang." />
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

/** Kartu sorot: satu tugas terdekat, dengan jalan pintas ke absensinya. */
function HeroSession({
  schedule,
  hariIni,
  onPress,
}: {
  schedule: ScheduleOccurrence;
  hariIni: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const sudahDibuka = Boolean(schedule.meeting);
  return (
    <View
      style={[
        styles.hero,
        { backgroundColor: theme.heroSurface, borderColor: theme.heroBorder, boxShadow: Elevation.brand },
      ]}>
      <ThemedText selectable type="overline" style={{ color: theme.heroAccent }}>
        {hariIni ? 'SESI HARI INI' : 'JADWAL BERIKUTNYA'}
      </ThemedText>

      <View style={styles.heroBody}>
        <View style={[styles.heroTime, { borderRightColor: theme.heroAccent }]}>
          <ThemedText selectable style={[styles.heroStart, { color: theme.heroText }]}>
            {schedule.start_time}
          </ThemedText>
          <ThemedText selectable style={[styles.heroEnd, { color: theme.heroTextSecondary }]}>
            {schedule.end_time}
          </ThemedText>
        </View>
        <View style={styles.heroText}>
          <ThemedText selectable style={[styles.heroTitle, { color: theme.heroText }]}>
            {schedule.subject} — {schedule.class.name}
          </ThemedText>
          <ThemedText selectable type="caption" style={{ color: theme.heroTextSecondary }}>
            {hariIni ? schedule.place : `${formatDate(schedule.occurrence_date)} · ${schedule.place}`}
          </ThemedText>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={sudahDibuka ? 'Buka absensi' : 'Buka detail tugas'}
        onPress={onPress}
        style={({ pressed }) => [
          styles.heroButton,
          { backgroundColor: theme.card, opacity: pressed ? 0.85 : 1 },
        ]}>
        <AppIcon name={sudahDibuka ? 'check' : 'arrow-right'} size={19} themeColor="primary" />
        <ThemedText selectable type="bodyBold" themeColor="primary">
          {sudahDibuka ? 'Buka absensi' : 'Buka detail tugas'}
        </ThemedText>
      </Pressable>
    </View>
  );
}

/** Kartu sorot untuk akun tanpa jadwal mengajar. */
function HeroPerizinan({ jumlahCakupan, onPress }: { jumlahCakupan: number; onPress: () => void }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.hero,
        { backgroundColor: theme.heroSurface, borderColor: theme.heroBorder, boxShadow: Elevation.brand },
      ]}>
      <ThemedText selectable type="overline" style={{ color: theme.heroAccent }}>
        PERIZINAN SANTRI
      </ThemedText>
      <ThemedText selectable style={[styles.heroTitle, { color: theme.heroText }]}>
        Kelola pengajuan izin
      </ThemedText>
      <ThemedText selectable type="caption" style={{ color: theme.heroTextSecondary }}>
        {jumlahCakupan > 1
          ? `Akun Anda memiliki ${jumlahCakupan} cakupan peran.`
          : 'Antrean tindakan dan riwayat pengajuan ada di sini.'}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Buka menu perizinan"
        onPress={onPress}
        style={({ pressed }) => [
          styles.heroButton,
          { backgroundColor: theme.card, opacity: pressed ? 0.85 : 1 },
        ]}>
        <AppIcon name="izin" size={19} themeColor="primary" />
        <ThemedText selectable type="bodyBold" themeColor="primary">
          Buka menu perizinan
        </ThemedText>
      </Pressable>
    </View>
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
  hero: {
    borderWidth: 1,
    borderRadius: Radius.hero,
    borderCurve: 'continuous',
    padding: 18,
    gap: 12,
  },
  heroBody: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  heroTime: { borderRightWidth: 1, paddingRight: 14, gap: 1 },
  heroStart: { fontSize: 23, lineHeight: 26, fontWeight: '800', fontVariant: ['tabular-nums'] },
  heroEnd: { fontSize: 12, lineHeight: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  heroText: { flex: 1, gap: 4 },
  heroTitle: { fontSize: 17, lineHeight: 22, fontWeight: '800' },
  heroButton: {
    minHeight: 48,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickRow: { flexDirection: 'row', gap: 9 },
  quickTile: {
    flex: 1,
    minHeight: 76,
    borderWidth: 1,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 4,
  },
  quickLabel: { fontSize: 11, lineHeight: 13, fontWeight: '700' },
});
