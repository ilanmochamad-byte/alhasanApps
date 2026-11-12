import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
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
import { KartuIdentitas } from '@/components/profil-shared';
import { ScheduleCard, formatDate } from '@/components/schedule-card';
import { ScreenHeader } from '@/components/screen-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { HeroCard } from '@/components/ui/hero-card';
import { MenuTileGrid, type MenuTileItem } from '@/components/ui/menu-tile';
import { StatGrid, type StatItem } from '@/components/ui/stat-card';
import { SectionHeader } from '@/components/ui/surface';
import { Layout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { attendanceShortcut } from '@/lib/attendance-shortcut';
import { keadaanMenuBeranda } from '@/lib/home-menu';
import { labelKelas } from '@/lib/kelas-jadwal';
import { useNotifications } from '@/notifications/notification-context';
import { useProfil } from '@/profil/profil-context';

/** Skala teks sistem di atas ini dianggap "sangat besar" untuk tata letak berkolom. */
const TEKS_BESAR = 1.35;

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
  const { muat: muatProfil, data: pribadi } = useProfil();
  const { jumlahBelumDibaca, jumlahBelumDibacaTermuat } = useNotifications();
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
      // Status/penugasan kartu dihitung ulang server setiap kembali ke Beranda.
      void muatProfil();
    }, [load, muatProfil]),
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

  // Redesain gelombang 2 (K-3): ringkasan HANYA dari data yang sudah dimuat
  // Beranda — jadwal hari ini (`/today`), profil pribadi, dan hitungan
  // notifikasi milik lonceng. Tidak ada permintaan API baru.
  const ringkasan: StatItem[] = [
    ...(aksesJadwal && data
      ? [
          { icon: 'calendar', value: String(data.schedules.length), label: 'Sesi hari ini' },
          {
            icon: 'check',
            value: String(data.schedules.filter((item) => item.meeting?.status !== 'Selesai').length),
            label: 'Sesi belum selesai diabsen',
            tone: 'warning',
          },
        ] satisfies StatItem[]
      : []),
    ...(!aksesJadwal && pribadi
      ? [{ icon: 'users', value: String(pribadi.penugasan.length), label: 'Penugasan aktif' }] satisfies StatItem[]
      : []),
    ...(!aksesJadwal && jumlahBelumDibacaTermuat
      ? [{ icon: 'bell', value: String(jumlahBelumDibaca), label: 'Notifikasi belum dibaca', tone: 'info' }] satisfies StatItem[]
      : []),
  ];

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* K-9: kepala Beranda — logo teks + lonceng, tanpa tombol kembali. Di
          luar area gulir agar kartu identitas tetap isi pertama. */}
      <View style={[styles.kepala, { paddingTop: insets.top + 6 }]}>
        <ScreenHeader variant="beranda" />
      </View>
    <ScrollView
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { void muatProfil(); void load(true); }} tintColor={theme.primary} />
      }>
      {/* PRD-PROFIL-IMPORT Fase 2: kartu identitas adalah isi pertama Beranda. */}
      <KartuIdentitas />

      {sorot ? (
        <HeroSession
          schedule={sorot}
          hariIni={sorotHariIni}
          onPress={() => openSchedule(sorot)}
        />
      ) : adaPerizinan ? (
        <HeroCard
          overline="PERIZINAN SANTRI"
          title="Kelola pengajuan izin"
          caption={capabilities.list.length > 1
            ? `Akun Anda memiliki ${capabilities.list.length} cakupan peran.`
            : 'Antrean tindakan dan riwayat pengajuan ada di sini.'}
          action={{ label: 'Buka menu perizinan', icon: 'izin', onPress: () => router.push('/perizinan') }}
        />
      ) : null}

      {ringkasan.length > 0 ? (
        <View style={styles.bagian}>
          <SectionHeader title="Ringkasan hari ini" />
          <StatGrid items={ringkasan} />
        </View>
      ) : null}

      {keadaanMenu === 'ada' ? (
        <View style={styles.bagian}>
          <SectionHeader title="Menu" />
          <MenuTileGrid items={menu} />
        </View>
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
        <View style={styles.bagian}>
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
        </View>
      ) : null}
    </ScrollView>
    </View>
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
    <HeroCard
      overline={hariIni ? 'SESI HARI INI' : 'JADWAL BERIKUTNYA'}
      action={{
        label: sudahDibuka ? 'Buka absensi' : 'Buka detail tugas',
        icon: sudahDibuka ? 'check' : 'arrow-right',
        onPress,
      }}>
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
    </HeroCard>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  kepala: { paddingHorizontal: Layout.screen, paddingBottom: 6, maxWidth: 760, width: '100%', alignSelf: 'center' },
  content: {
    paddingHorizontal: Layout.screen,
    paddingTop: 8,
    paddingBottom: 120,
    gap: Layout.sectionGap,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  bagian: { gap: Layout.cardGap },
  heroBody: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  heroBodyStacked: { flexDirection: 'column', gap: 8 },
  heroTime: { borderRightWidth: 1, paddingRight: 14, gap: 1 },
  heroTimeStacked: { borderRightWidth: 0, paddingRight: 0, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  heroStart: { fontSize: 23, lineHeight: 26, fontWeight: '800', fontVariant: ['tabular-nums'] },
  heroEnd: { fontSize: 12, lineHeight: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  heroText: { flex: 1, gap: 4 },
  heroTitle: { fontSize: 17, lineHeight: 22, fontWeight: '800' },
});
