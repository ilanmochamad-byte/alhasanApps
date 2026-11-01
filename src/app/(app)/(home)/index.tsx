import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRaporAkses } from '@/components/rapor-entry';
import { usePembinaanAkses } from '@/components/pembinaan-entry';
import { useKesehatanAkses } from '@/components/kesehatan-shared';
import { useKeuanganAkses } from '@/components/keuangan-shared';
import { useKeamananAkses } from '@/components/keamanan-shared';
import { actionableError, api } from '@/api/client';
import type { ScheduleOccurrence, TodayResponse } from '@/api/types';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { NotificationBell } from '@/components/notification-bell';
import { ScheduleCard, formatDate } from '@/components/schedule-card';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { MenuTileGrid, type MenuTileItem } from '@/components/ui/menu-tile';
import { SectionHeader } from '@/components/ui/surface';
import { Elevation, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { attendanceShortcut } from '@/lib/attendance-shortcut';
import { keadaanMenuBeranda } from '@/lib/home-menu';
import { labelKelas } from '@/lib/kelas-jadwal';

/** Skala teks sistem di atas ini dianggap "sangat besar" untuk tata letak berkolom. */
const TEKS_BESAR = 1.35;

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
  const insets = useSafeAreaInsets();
  const { profile, capabilities } = useAuth();
  const aksesPembinaan = usePembinaanAkses();
  const aksesRapor = useRaporAkses();
  const aksesKesehatan = useKesehatanAkses();
  const aksesKeuangan = useKeuanganAkses();
  const aksesKeamanan = useKeamananAkses();
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
  // Kartu sorot sudah menampilkan satu sesi secara penuh; daftar di bawahnya
  // menghilangkan sesi itu supaya tidak muncul dua kali di layar yang sama.
  const sisaHariIni = data
    ? data.schedules.filter((item) => !(sorotHariIni && sorot && item.id === sorot.id))
    : [];
  const tampilkanBerikutnya = Boolean(data?.next_schedule) && sorotHariIni;
  const tujuanAbsensi = attendanceShortcut(data?.schedules ?? []);

  // Redesain tampilan (Konsep A): menu ubin besar, tetap tiga kolom. Urutan
  // tetap; ubin yang tidak berhak tidak ditampilkan. Menyembunyikan ubin
  // bukan kontrol akses — server tetap memeriksa cakupan.
  const menu: MenuTileItem[] = [
    ...(aksesRapor.tersedia ? [{ icon: 'chart', label: 'Rapor', tone: 'info', onPress: () => router.push('/rapor') }] satisfies MenuTileItem[] : []),
    ...(aksesJadwal
      ? [
          { icon: 'calendar', label: 'Jadwal', onPress: () => router.push('/schedules') },
          {
            icon: 'check',
            label: 'Absensi',
            // Langsung ke sesi hari ini yang belum selesai; bila tidak ada,
            // pengguna memilih sendiri dari daftar jadwal.
            onPress: () => (tujuanAbsensi ? openSchedule(tujuanAbsensi) : router.push('/schedules')),
          },
        ] satisfies MenuTileItem[]
      : []),
    ...(adaPerizinan
      ? [{ icon: 'izin', label: 'Perizinan', tone: 'warning', onPress: () => router.push('/perizinan') }] satisfies MenuTileItem[]
      : []),
    ...(aksesJadwal
      ? [{ icon: 'chart', label: 'Laporan', tone: 'info', onPress: () => router.push('/reports') }] satisfies MenuTileItem[]
      : []),
    ...(adaPerizinan
      ? [
          {
            icon: 'printer',
            label: 'Cetak Izin',
            tone: 'info',
            onPress: () =>
              router.push({ pathname: '/izin/laporan', params: { mode: capabilities.default_mode ?? '' } }),
          },
        ] satisfies MenuTileItem[]
      : []),
    ...(aksesPembinaan.tersedia
      ? [{ icon: 'users', label: 'Pembinaan', tone: 'violet', onPress: () => router.push('/pembinaan') }] satisfies MenuTileItem[]
      : []),
    // V5: pembaca internal ke pintu kesehatan; wali saja langsung ke "Kesehatan anak".
    ...(aksesKesehatan.tersedia
      ? [{ icon: 'medical', label: aksesKesehatan.label, tone: 'primary', onPress: () => router.push(aksesKesehatan.internal ? '/kesehatan' : '/kesehatan/wali') }] satisfies MenuTileItem[]
      : []),
    // V6: petugas BSA, admin, dan orang tua; hak tiap layar tetap diperiksa server.
    ...(aksesKeuangan.tersedia
      ? [{ icon: 'wallet', label: aksesKeuangan.wali ? 'Keuangan anak' : 'Keuangan', tone: 'info', onPress: () => router.push('/keuangan') }] satisfies MenuTileItem[]
      : []),
    // Penugasan Keamanan (lintas guru/pengurus Fase 4): hanya baca; hak tiap layar tetap diperiksa server.
    ...(aksesKeamanan.tersedia
      ? [{ icon: 'eye', label: 'Keamanan', tone: 'warning', onPress: () => router.push('/keamanan') }] satisfies MenuTileItem[]
      : []),
  ];

  const keadaanMenu = keadaanMenuBeranda(menu.length, aksesPembinaan.status === 'memuat' || aksesRapor.status === 'memuat' || aksesKesehatan.status === 'memuat' || aksesKeuangan.status === 'memuat' || aksesKeamanan.status === 'memuat' ? 'memuat'
    : aksesPembinaan.error || aksesRapor.error || aksesKesehatan.error || aksesKeuangan.error || aksesKeamanan.error ? 'gagal' : 'siap');

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="never"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.primary} />
      }>
      {/* Lonceng sebaris dengan tanggal agar sapaan mendapat lebar penuh dan
          tetap terbaca ketika ukuran teks sistem diperbesar. */}
      <View style={styles.greeting}>
        <View style={styles.header}>
          <ThemedText selectable type="caption" themeColor="textSecondary" style={styles.date}>
            {tanggalHariIni()}
          </ThemedText>
          <NotificationBell />
        </View>
        <ThemedText selectable style={styles.greetingName}>
          Assalamu&rsquo;alaikum, {profile?.guru?.name ?? profile?.name ?? ''}
        </ThemedText>
      </View>

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

      {keadaanMenu === 'ada' ? (
        <>
          <SectionHeader title="Menu" />
          <MenuTileGrid items={menu} />
        </>
      ) : keadaanMenu === 'memuat' ? (
        <LoadingState label="Memeriksa menu akun…" />
      ) : keadaanMenu === 'kosong' ? (
        <EmptyState
          title="Akun ini belum memiliki menu"
          message="Belum ada jadwal, perizinan, atau pembinaan untuk akun ini. Hubungi admin pesantren bila seharusnya ada."
        />
      ) : null}

      {aksesRapor.error && <AppButton label="Muat ulang akses rapor" variant="secondary" onPress={aksesRapor.muatUlang} />}
      {aksesKesehatan.error ? <AppButton label="Muat ulang akses kesehatan" variant="secondary" onPress={aksesKesehatan.muatUlang} /> : null}
      {aksesKeuangan.error ? <AppButton label="Muat ulang akses keuangan" variant="secondary" onPress={aksesKeuangan.muatUlang} /> : null}
      {aksesKeamanan.error ? <AppButton label="Muat ulang akses Keamanan" variant="secondary" onPress={aksesKeamanan.muatUlang} /> : null}
      {aksesPembinaan.error ? (
        <AppButton label="Muat ulang akses pembinaan" variant="secondary" onPress={aksesPembinaan.muatUlang} />
      ) : null}

      {!aksesJadwal ? (
        keadaanMenu === 'ada' ? (
          <ThemedText selectable type="caption" themeColor="textSecondary">
            Akun ini tidak memiliki jadwal mengajar, sehingga menu jadwal dan laporan tidak ditampilkan.
          </ThemedText>
        ) : null
      ) : loading && !data ? (
        <LoadingState label="Memuat jadwal hari ini…" />
      ) : error && !data ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : data ? (
        <>
          {/* Tanggal sudah tampil di sapaan; mengulanginya di sini memeras
              judul hingga terpecah ketika ukuran teks diperbesar. */}
          <SectionHeader title="Jadwal hari ini" />
          {data.schedules.length === 0 ? (
            <EmptyState
              title="Tidak ada jadwal hari ini"
              message="Jadwal berikutnya ditampilkan di kartu atas."
            />
          ) : sisaHariIni.length === 0 ? (
            <ThemedText selectable type="caption" themeColor="textMuted">
              Hanya ada satu sesi hari ini — ada di kartu atas.
            </ThemedText>
          ) : (
            sisaHariIni.map((schedule) => (
              <ScheduleCard
                key={`${schedule.id}-${schedule.occurrence_date}`}
                schedule={schedule}
                hideDate
                onPress={() => openSchedule(schedule)}
              />
            ))
          )}

          {tampilkanBerikutnya ? (
            <>
              <SectionHeader title="Jadwal berikutnya" />
              <ScheduleCard
                schedule={data.next_schedule!}
                onPress={() => openSchedule(data.next_schedule!)}
              />
            </>
          ) : null}
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
  const { fontScale } = useWindowDimensions();
  // Pada teks sistem yang sangat besar, kolom jam menyisakan terlalu sedikit
  // ruang bagi judul; jam lalu ditaruh di atas judul.
  const bertumpuk = fontScale > TEKS_BESAR;
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

      <View style={[styles.heroBody, bertumpuk && styles.heroBodyStacked]}>
        <View
          style={[
            styles.heroTime,
            bertumpuk ? styles.heroTimeStacked : { borderRightColor: theme.heroAccent },
          ]}>
          <ThemedText selectable style={[styles.heroStart, { color: theme.heroText }]}>
            {schedule.start_time}
          </ThemedText>
          <ThemedText selectable style={[styles.heroEnd, { color: theme.heroTextSecondary }]}>
            {schedule.end_time}
          </ThemedText>
        </View>
        <View style={styles.heroText}>
          <ThemedText selectable style={[styles.heroTitle, { color: theme.heroText }]}>
            {schedule.subject} — {labelKelas(schedule)}
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
        <ThemedText selectable type="bodyBold" themeColor="primary" style={styles.heroButtonText}>
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
        <ThemedText selectable type="bodyBold" themeColor="primary" style={styles.heroButtonText}>
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
  heroBodyStacked: { flexDirection: 'column', gap: 8 },
  heroTime: { borderRightWidth: 1, paddingRight: 14, gap: 1 },
  heroTimeStacked: { borderRightWidth: 0, paddingRight: 0, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
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
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  // Boleh membungkus agar teks tombol tidak terpotong pada teks sistem besar.
  heroButtonText: { flexShrink: 1, textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  greeting: { gap: 2, paddingBottom: 4 },
  date: { flex: 1, fontSize: 13, lineHeight: 17 },
  greetingName: { fontSize: 22, lineHeight: 28, fontWeight: '800', letterSpacing: -0.3 },
});
