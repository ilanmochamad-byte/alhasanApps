import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { actionableError, api } from '@/api/client';
import type { AnakListResponse, IzinCapability, IzinListResponse } from '@/api/types';
import { useAuth } from '@/auth/auth-context';
import { IzinCard } from '@/components/izin-card';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import { MODE_LABEL, ModeSwitcher } from '@/components/mode-switcher';
import { ScreenHeader } from '@/components/screen-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { SearchField } from '@/components/ui/app-field';
import { Fab } from '@/components/ui/fab';
import { IconButton } from '@/components/ui/icon-button';
import { Segmented } from '@/components/ui/segmented';
import { StatTile } from '@/components/ui/stat-tile';
import { Overline, Panel } from '@/components/ui/surface';
import { AppButton } from '@/components/app-button';
import { useTheme } from '@/hooks/use-theme';

type Tampilan = 'antrean' | 'semua';

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
  const { capabilities } = useAuth();

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
  const tampilanAktif: Tampilan = orangTua ? 'semua' : tampilan;

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
          tampilanAktif === 'antrean' ? await api.izinAntrean(query) : await api.izinList(query);
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

  const ringkasan = useMemo(() => {
    if (!data) return [] as { label: string; nilai: number }[];
    return [
      { label: 'Total', nilai: data.summary.total },
      ...Object.entries(data.summary.per_status).map(([label, nilai]) => ({
        label,
        nilai: Number(nilai),
      })),
    ];
  }, [data]);

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
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}>
        <ScreenHeader title="Perizinan" />
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
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.primary} />
        }>
        <ScreenHeader
          title="Perizinan"
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

        <ThemedText selectable type="caption" themeColor="textSecondary">
          {data?.scope.label ?? (modeAktif ? MODE_LABEL[modeAktif] : '')}
        </ThemedText>

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
              Akun orang tua bersifat baca-saja: tidak tersedia tombol pengajuan, keputusan, atau
              pembatalan.
            </ThemedText>
          </Panel>
        ) : (
          <Segmented
            accessibilityLabel="Tampilan daftar pengajuan"
            value={tampilanAktif}
            onChange={(next) => {
              setTampilan(next);
              setHalaman(1);
            }}
            options={[
              { value: 'antrean', label: 'Antrean tindakan', count: data?.antrean_admin },
              { value: 'semua', label: 'Semua pengajuan' },
            ]}
          />
        )}

        <SearchField
          value={pencarian}
          onChangeText={setPencarian}
          placeholder="Cari santri, NIS, atau alasan"
          onSubmitEditing={terapkanPencarian}
          trailing={
            pencarian.trim() !== kataKunci ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Terapkan pencarian"
                onPress={terapkanPencarian}
                hitSlop={8}>
                <ThemedText selectable type="label" themeColor="primary">
                  Terapkan
                </ThemedText>
              </Pressable>
            ) : null
          }
        />

        {loading && !data ? (
          <LoadingState label="Memuat pengajuan izin…" />
        ) : error && !data ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : data ? (
          <>
            {error ? (
              <ThemedText selectable type="caption" themeColor="danger">
                {error}
              </ThemedText>
            ) : null}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.summaryRow}>
              {ringkasan.map((baris, index) => (
                <View key={baris.label} style={styles.summaryItem}>
                  <StatTile
                    compact
                    label={baris.label}
                    value={baris.nilai}
                    tone={index === 0 ? 'primary' : 'neutral'}
                  />
                </View>
              ))}
            </ScrollView>

            {data.items.length === 0 ? (
              <EmptyState
                title={tampilanAktif === 'antrean' ? 'Tidak ada antrean tindakan' : 'Belum ada pengajuan'}
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

      {capabilities.aksi.dapat_membuat_pengajuan && !orangTua ? (
        <Fab
          label="Buat izin"
          onPress={() =>
            router.push({ pathname: '/izin/buat', params: { mode: modeAktif ?? 'pengurus' } })
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 130,
    gap: 12,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  summaryRow: { gap: 8, paddingVertical: 2 },
  summaryItem: { width: 104 },
  pagerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 6,
  },
  pagerButton: { flexShrink: 1, minWidth: 124 },
});
