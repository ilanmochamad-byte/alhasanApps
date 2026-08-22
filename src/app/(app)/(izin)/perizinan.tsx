import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { actionableError, api } from '@/api/client';
import type { AnakListResponse, IzinCapability, IzinListResponse } from '@/api/types';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { IzinCard } from '@/components/izin-card';
import { MODE_LABEL, ModeSwitcher } from '@/components/mode-switcher';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
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

  // Native tabs mempertahankan layar yang sudah pernah dibuka. Mengganti key
  // ketika identitas berubah memastikan cakupan, filter, data, dan posisi gulir
  // akun sebelumnya tidak ikut terbawa ke sesi baru.
  return <PerizinanSession key={profile?.id ?? 'guest'} />;
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
      ...Object.entries(data.summary.per_status).map(([label, nilai]) => ({ label, nilai: Number(nilai) })),
    ];
  }, [data]);

  if (modes.length === 0) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}>
        <EmptyState
          title="Belum ada kemampuan perizinan"
          message="Akun ini belum terhubung ke pengurus, wali, atau penugasan murobi aktif. Hubungi admin pesantren."
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.primary} />
      }>
      <ModeSwitcher
        modes={modes}
        value={modeAktif}
        onChange={(next) => {
          setMode(next);
          setHalaman(1);
        }}
      />

      <ThemedText selectable themeColor="textSecondary">
        {data?.scope.label ?? (modeAktif ? MODE_LABEL[modeAktif] : '')}
      </ThemedText>

      {orangTua ? (
        <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <ThemedText selectable style={styles.panelTitle}>
            Anak yang terhubung
          </ThemedText>
          {anak === null ? (
            <ThemedText selectable type="small" themeColor="textSecondary">
              Memuat daftar anak…
            </ThemedText>
          ) : anak.items.length === 0 ? (
            <ThemedText selectable type="small" themeColor="textSecondary">
              Belum ada santri dengan relasi wali aktif untuk akun ini.
            </ThemedText>
          ) : (
            anak.items.map((baris) => (
              <ThemedText selectable key={baris.santri.id}>
                {baris.santri.nama}{' '}
                <ThemedText selectable type="small" themeColor="textSecondary">
                  (NIS {baris.santri.nis}
                  {baris.hubungan ? ` · ${baris.hubungan}` : ''})
                </ThemedText>
              </ThemedText>
            ))
          )}
          <ThemedText selectable type="small" themeColor="textSecondary">
            Akun orang tua bersifat baca-saja: tidak tersedia tombol pengajuan, keputusan, atau pembatalan.
          </ThemedText>
        </View>
      ) : (
        <View style={styles.tabRow}>
          {(['antrean', 'semua'] as Tampilan[]).map((pilihan) => {
            const dipilih = pilihan === tampilanAktif;
            return (
              <Pressable
                key={pilihan}
                accessibilityRole="tab"
                accessibilityState={{ selected: dipilih }}
                onPress={() => {
                  setTampilan(pilihan);
                  setHalaman(1);
                }}
                style={({ pressed }) => [
                  styles.tabButton,
                  {
                    backgroundColor: dipilih ? theme.backgroundSelected : theme.backgroundElement,
                    borderColor: dipilih ? theme.primary : theme.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}>
                <ThemedText selectable type="smallBold">
                  {pilihan === 'antrean' ? 'Antrean tindakan' : 'Semua pengajuan'}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      )}

      {capabilities.aksi.dapat_membuat_pengajuan && !orangTua ? (
        <AppButton
          label="Buat pengajuan izin"
          onPress={() =>
            router.push({
              pathname: '/izin/buat',
              params: { mode: modeAktif ?? 'pengurus' },
            })
          }
        />
      ) : null}

      <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ThemedText selectable type="smallBold">
          Cari santri, NIS, atau alasan
        </ThemedText>
        <TextInput
          value={pencarian}
          onChangeText={setPencarian}
          placeholder="Ketik lalu tekan Terapkan"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          returnKeyType="search"
          onSubmitEditing={() => {
            setKataKunci(pencarian.trim());
            setHalaman(1);
          }}
        />
        <AppButton
          label="Terapkan pencarian"
          variant="secondary"
          onPress={() => {
            setKataKunci(pencarian.trim());
            setHalaman(1);
          }}
        />
      </View>

      {loading && !data ? (
        <LoadingState label="Memuat pengajuan izin…" />
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
            {ringkasan.map((baris) => (
              <View
                key={baris.label}
                style={[styles.summaryChip, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <ThemedText selectable type="small" themeColor="textSecondary">
                  {baris.label}
                </ThemedText>
                <ThemedText selectable type="smallBold">
                  {baris.nilai}
                </ThemedText>
              </View>
            ))}
          </View>

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
                  router.push({ pathname: '/izin/[id]', params: { id: String(item.id), mode: modeAktif ?? '' } })
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
                  disabled={data.pagination.current_page <= 1}
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
                  disabled={data.pagination.current_page >= data.pagination.total_pages}
                  onPress={() => setHalaman((current) => current + 1)}
                />
              </View>
            </View>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 120, gap: 14, maxWidth: 760, width: '100%', alignSelf: 'center' },
  panel: { borderWidth: 1, borderRadius: 18, borderCurve: 'continuous', padding: 16, gap: 10 },
  panelTitle: { fontSize: 17, fontWeight: '800' },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 15 },
  tabRow: { flexDirection: 'row', gap: 8 },
  tabButton: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 11, alignItems: 'center' },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryChip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 7, minWidth: 92 },
  pagerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 6 },
  pagerButton: { flexShrink: 1, minWidth: 128 },
});
