import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { actionableError, api } from '@/api/client';
import type { AnakListResponse, IzinCapability, IzinListResponse } from '@/api/types';
import { useAuth } from '@/auth/auth-context';
import { IzinCard } from '@/components/izin-card';
import { useIzinWaliAkses } from '@/components/izin-wali-shared';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import { MODE_LABEL, ModeSwitcher } from '@/components/mode-switcher';
import { ScreenHeader } from '@/components/screen-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { EntityRow } from '@/components/ui/entity-row';
import { Fab, FabArea, FAB_RUANG_BAWAH } from '@/components/ui/fab';
import { FilterPills } from '@/components/ui/filter-pills';
import { IconButton } from '@/components/ui/icon-button';
import { Notice } from '@/components/ui/notice';
import { SearchBar } from '@/components/ui/search-bar';
import { Overline, Panel } from '@/components/ui/surface';
import { AppButton } from '@/components/app-button';
import { BottomTabInset, Layout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fabMelewatiSetengahLayar, jarakAtasLayarTab } from '@/lib/tampilan';

/**
 * Redesain tampilan Fase 2: segmen antrean/semua dan deret ringkasan angka
 * diganti pil filter (Konsep B). "Disetujui" dan "Ditolak" memakai parameter
 * `status` yang sudah didukung API daftar; tidak ada perubahan server.
 *
 * Redesain gelombang 2 (§4.2, K-8, K-10): pola P-Akar + P-Daftar — ← ke
 * Beranda, judul besar + penjelas cakupan, SearchBar, FilterPills, baris
 * entitas, dan FAB "Ajukan izin" di kanan bawah di atas bilah tab. Parameter
 * dan urutan permintaan API tidak berubah.
 */
type Tampilan = 'antrean' | 'semua' | 'Disetujui' | 'Ditolak';

/**
 * Layar perizinan multi-peran (PRD V2 Fase 3 §4–§8).
 *
 * Menu dan tindakan yang muncul di sini berasal dari capability yang dikirim
 * server, bukan dari nama role. Layar ini hanyalah cermin: server tetap
 * memaksakan cakupan pada setiap permintaan, sehingga menyembunyikan tombol
 * tidak pernah menjadi satu-satunya kontrol akses.
 */
export default function PerizinanScreen() {
  const { profile } = useAuth();
  const { fontScale } = useWindowDimensions();

  // Native tabs mempertahankan layar yang sudah pernah dibuka. Mengganti key
  // ketika identitas berubah memastikan cakupan, filter, data, dan posisi gulir
  // akun sebelumnya tidak ikut terbawa ke sesi baru. Skala teks ikut menjadi
  // bagian key agar perubahan Dynamic Type menghitung ulang layout seketika.
  return <PerizinanSession key={`${profile?.id ?? 'guest'}:${fontScale}`} />;
}

function PerizinanSession() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { capabilities } = useAuth();
  // V7 Fase 4: pintu alur orang tua → pembimbing → murobi. Akses dihitung
  // ulang server; modul belum terpasang (503) berarti pintu tidak tampil.
  const { akses: aksesWali } = useIzinWaliAkses();
  const adaAksesWali = Boolean(aksesWali && (aksesWali.wali || aksesWali.pembimbing || aksesWali.admin || aksesWali.murobi));
  const antreanWali = (aksesWali?.antrean_pembimbing ?? 0) + (aksesWali?.antrean_admin ?? 0);
  const pintuWali = adaAksesWali ? (
    <EntityRow
      icon="users"
      tone="info"
      title="Izin orang tua melalui pembimbing"
      subtitle={`${
        aksesWali?.wali
          ? 'Ajukan izin anak, perbaiki saat diminta pembimbing, dan pantau statusnya.'
          : 'Tinjau, tetapkan, atau pantau pengajuan yang dibuat orang tua.'
      }${antreanWali > 0 ? ` ${antreanWali} menunggu tindakan.` : ''}`}
      accessibilityLabel="Buka izin orang tua melalui pembimbing"
      onPress={() => router.push('/izin-wali')}
    />
  ) : null;

  const modes = capabilities.list;
  const [mode, setMode] = useState<IzinCapability | null>(capabilities.default_mode);
  const [tampilan, setTampilan] = useState<Tampilan>('antrean');
  const [pencarian, setPencarian] = useState('');
  const [kataKunci, setKataKunci] = useState('');
  const [halaman, setHalaman] = useState(1);

  const [data, setData] = useState<IzinListResponse | null>(null);
  const [anak, setAnak] = useState<AnakListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const modeAktif = mode ?? capabilities.default_mode;
  const orangTua = modeAktif === 'orang_tua';
  // Orang tua tidak memiliki antrean tindakan; layarnya selalu berupa daftar.
  const tampilanAktif: Tampilan = orangTua && tampilan === 'antrean' ? 'semua' : tampilan;

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        if (modeAktif === null) {
          setData(null);
          setAnak(null);
          return;
        }
        const query = { mode: modeAktif, q: kataKunci, page: halaman, per_page: 20 };
        const hasil =
          tampilanAktif === 'antrean'
            ? await api.izinAntrean(query)
            : await api.izinList(tampilanAktif === 'semua' ? query : { ...query, status: tampilanAktif });
        setData(hasil);
        setAnak(modeAktif === 'orang_tua' ? await api.izinAnak() : null);
      } catch (caught) {
        setError(actionableError(caught));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [modeAktif, tampilanAktif, kataKunci, halaman],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Jumlah antrean hanya diketahui pasti saat daftar antrean sedang dimuat
  // (total paginasinya); `antrean_admin` dipakai bila server mengirimkannya.
  // `summary` adalah ringkasan seluruh cakupan, bukan jumlah hasil filter.
  const jumlahAntrean =
    typeof data?.antrean_admin === 'number'
      ? data.antrean_admin
      : tampilanAktif === 'antrean' && data && !kataKunci
        ? data.pagination.total
        : null;

  const { fontScale, width } = useWindowDimensions();
  const [cariAktif, setCariAktif] = useState(false);
  // K-8: FAB ikon + teks di kanan bawah. Pada teks sistem sangat besar tombol
  // melebar; bila lebarnya dapat melewati setengah layar, dipakai alternatif
  // yang disetujui: tombol pil lebar penuh di bawah judul, sebelum kotak cari.
  const fabTerlaluLebar = fabMelewatiSetengahLayar(fontScale, width);
  const dapatMengajukan = capabilities.aksi.dapat_membuat_pengajuan && !orangTua;
  // Ruang kosong di dasar daftar setinggi FAB + 16 (K-8). Di iOS isi layar tab
  // bergulir di balik bilah tab, sehingga tinggi bilah ikut ditambahkan; di
  // Android/web isi sudah berakhir di atas/bawah bilah.
  const ruangBawah = FAB_RUANG_BAWAH + 16 + 24 + (Platform.OS === 'ios' ? BottomTabInset + insets.bottom : 0);
  const ajukan = () => router.push({ pathname: '/izin/buat', params: { mode: modeAktif ?? 'pengurus' } });

  function terapkanPencarian() {
    setKataKunci(pencarian.trim());
    setHalaman(1);
  }

  const bukaLaporan = useCallback(() => {
    router.push({ pathname: '/izin/laporan', params: { mode: modeAktif ?? '' } });
  }, [router, modeAktif]);

  if (modes.length === 0) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={[styles.content, { paddingTop: jarakAtasLayarTab(Platform.OS, insets.top) }]}>
        <ScreenHeader variant="akar" title="Perizinan" subtitle="Pengajuan izin santri" bell />
        {pintuWali}
        <EmptyState
          title="Belum ada kemampuan perizinan"
          message="Akun ini belum terhubung ke pengurus, wali, atau penugasan murobi aktif. Hubungi admin pesantren."
        />
      </ScrollView>
    );
  }

  return (
    <View style={styles.screen}>
      <KeyboardAwareScrollView
        contentInsetAdjustmentBehavior="never"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={[styles.content, { paddingTop: jarakAtasLayarTab(Platform.OS, insets.top), paddingBottom: ruangBawah }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.primary} />
        }>
        <ScreenHeader
          variant="akar"
          title="Perizinan"
          subtitle={data?.scope.label ?? (modeAktif ? MODE_LABEL[modeAktif] : '')}
          bell
          actions={
            /* V2 Fase 5 — laporan tersedia untuk SELURUH peran perizinan,
               termasuk orang tua. Isi laporan dibatasi cakupan di server,
               bukan oleh tombol ini. */
            <IconButton icon="chart" accessibilityLabel="Laporan perizinan" onPress={bukaLaporan} />
          }
        />

        <ModeSwitcher
          modes={modes}
          value={modeAktif}
          onChange={(next) => {
            setMode(next);
            setHalaman(1);
          }}
        />

        {pintuWali}

        {orangTua ? (
          <Panel>
            <Overline>Anak yang terhubung</Overline>
            {anak === null ? (
              <ThemedText selectable type="caption" themeColor="textSecondary">
                Memuat daftar anak…
              </ThemedText>
            ) : anak.items.length === 0 ? (
              <ThemedText selectable type="caption" themeColor="textSecondary">
                Belum ada santri dengan relasi wali aktif untuk akun ini.
              </ThemedText>
            ) : (
              anak.items.map((baris) => (
                <ThemedText selectable type="body" key={baris.santri.id}>
                  {baris.santri.nama}{' '}
                  <ThemedText selectable type="caption" themeColor="textSecondary">
                    (NIS {baris.santri.nis}
                    {baris.hubungan ? ` · ${baris.hubungan}` : ''})
                  </ThemedText>
                </ThemedText>
              ))
            )}
            <ThemedText selectable type="caption" themeColor="textMuted">
              Daftar di bawah memuat izin yang diajukan pengurus (baca-saja). Pengajuan izin oleh
              orang tua dibuat dan dipantau lewat “Izin orang tua melalui pembimbing”.
            </ThemedText>
          </Panel>
        ) : null}

        {dapatMengajukan && fabTerlaluLebar ? (
          <AppButton label="Ajukan izin baru" icon="plus" onPress={ajukan} />
        ) : null}

        <SearchBar
          accessibilityLabel="Cari pengajuan izin"
          value={pencarian}
          onChangeText={setPencarian}
          placeholder="Cari santri, NIS, atau alasan"
          onSubmitEditing={terapkanPencarian}
          onFocus={() => setCariAktif(true)}
          onBlur={() => setCariAktif(false)}
          trailing={
            pencarian.trim() !== kataKunci ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Terapkan pencarian"
                onPress={terapkanPencarian}
                hitSlop={8}
                style={styles.terapkan}>
                <ThemedText selectable type="label" themeColor="primary">
                  Terapkan
                </ThemedText>
              </Pressable>
            ) : null
          }
        />

        <FilterPills
          accessibilityLabel="Saring pengajuan"
          value={tampilanAktif}
          onChange={(next) => {
            setTampilan(next);
            setHalaman(1);
          }}
          options={[
            ...(orangTua
              ? []
              : [{ value: 'antrean' as Tampilan, label: jumlahAntrean !== null ? `Perlu tindakan · ${jumlahAntrean}` : 'Perlu tindakan' }]),
            { value: 'semua' as Tampilan, label: 'Semua' },
            { value: 'Disetujui' as Tampilan, label: 'Disetujui' },
            { value: 'Ditolak' as Tampilan, label: 'Ditolak' },
          ]}
        />

        {loading && !data ? (
          <LoadingState label="Memuat pengajuan izin…" />
        ) : error && !data ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : data ? (
          <>
            <Notice tone="danger" text={error} />

            <ThemedText selectable type="caption" themeColor="textSecondary">
              {data.pagination.total} pengajuan
            </ThemedText>

            {data.items.length === 0 ? (
              <EmptyState
                title={tampilanAktif === 'antrean' ? 'Tidak ada antrean tindakan' : 'Tidak ada pengajuan'}
                message={
                  tampilanAktif === 'antrean'
                    ? 'Tidak ada pengajuan yang menunggu tindakan Anda saat ini. Tarik ke bawah untuk memuat ulang.'
                    : 'Belum ada pengajuan dalam cakupan Anda, atau filter terlalu sempit.'
                }
              />
            ) : (
              data.items.map((item) => (
                <IzinCard
                  key={item.id}
                  item={item}
                  onPress={() =>
                    router.push({
                      pathname: '/izin/[id]',
                      params: { id: String(item.id), mode: modeAktif ?? '' },
                    })
                  }
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
                    disabled={data.pagination.current_page <= 1}
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
                    disabled={data.pagination.current_page >= data.pagination.total_pages}
                    onPress={() => setHalaman((current) => current + 1)}
                  />
                </View>
              </View>
            ) : null}
          </>
        ) : null}
      </KeyboardAwareScrollView>

      {dapatMengajukan && !fabTerlaluLebar ? (
        /* K-8: FAB di atas bilah tab dan hilang saat kotak cari aktif. */
        <FabArea hidden={Platform.OS === 'web' && cariAktif}>
          <Fab label="Ajukan izin" accessibilityLabel="Ajukan izin baru" onPress={ajukan} bottomOffset={16} />
        </FabArea>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: Layout.screen,
    // K-8: ruang kosong setinggi FAB + 16 agar baris terakhir dan paginasi
    // tetap dapat diketuk (ditambah jarak dasar layar).
    paddingBottom: FAB_RUANG_BAWAH + 16 + 24,
    gap: 12,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  terapkan: { minHeight: 44, justifyContent: 'center' },
  pagerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 6,
  },
  pagerButton: { flexShrink: 1, minWidth: 124 },
});
