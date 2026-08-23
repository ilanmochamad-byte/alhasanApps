import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { actionableError, api } from '@/api/client';
import type { Notifikasi, NotifikasiListResponse } from '@/api/types';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useNotifications } from '@/notifications/notification-context';

type Filter = 'semua' | 'belum_dibaca' | 'sudah_dibaca';

const FILTER_LABEL: Record<Filter, string> = {
  semua: 'Semua',
  belum_dibaca: 'Belum dibaca',
  sudah_dibaca: 'Sudah dibaca',
};

/**
 * Pusat notifikasi dalam aplikasi (PRD V2 Fase 4 §2).
 *
 * Kanal in-app adalah SUMBER STATUS UTAMA: layar ini tetap lengkap walaupun
 * push dimatikan admin, izin notifikasi ditolak perangkat, atau WhatsApp belum
 * pernah dikonfigurasi.
 *
 * Daftar selalu berisi notifikasi milik akun yang sedang masuk saja — tidak ada
 * parameter pemilik yang dikirim, dan server menolak id milik pengguna lain.
 */
export default function NotifikasiScreen() {
  const { profile } = useAuth();
  const { fontScale } = useWindowDimensions();

  // Sama seperti layar perizinan: mengganti key saat identitas atau skala teks
  // berubah mencegah data akun sebelumnya ikut terbawa.
  return <NotifikasiSession key={`${profile?.id ?? 'guest'}:${fontScale}`} />;
}

function NotifikasiSession() {
  const router = useRouter();
  const theme = useTheme();
  const { segarkanJumlah, kurangiJumlah, pushState } = useNotifications();

  const [filter, setFilter] = useState<Filter>('semua');
  const [halaman, setHalaman] = useState(1);
  const [data, setData] = useState<NotifikasiListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sibuk, setSibuk] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        setData(await api.notifikasiList({ status: filter, page: halaman, per_page: 20 }));
      } catch (caught) {
        setError(actionableError(caught));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filter, halaman],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
      void segarkanJumlah();
    }, [load, segarkanJumlah]),
  );

  async function tandaiSemua() {
    if (sibuk) return;
    setSibuk(true);
    try {
      await api.notifikasiTandaiSemua();
      await load(true);
      await segarkanJumlah();
    } catch (caught) {
      setError(actionableError(caught));
    } finally {
      setSibuk(false);
    }
  }

  function buka(item: Notifikasi) {
    if (!item.dibaca) kurangiJumlah();
    router.push({ pathname: '/notifikasi/[id]', params: { id: String(item.id) } });
  }

  const pagination = data?.pagination;
  const totalHalaman = pagination?.total_pages ?? 0;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.primary} />
      }>
      <View style={styles.header}>
        <ThemedText selectable themeColor="textSecondary">
          {data === null
            ? 'Memuat notifikasi…'
            : `${data.jumlah_belum_dibaca} belum dibaca dari ${pagination?.total ?? 0} notifikasi.`}
        </ThemedText>
        {pushState.status !== 'aktif' ? (
          <ThemedText selectable type="small" themeColor="textSecondary">
            {pushState.status === 'memeriksa'
              ? 'Memeriksa status push…'
              : `Push tidak aktif di perangkat ini. ${pushState.alasan} Notifikasi tetap tersedia di layar ini.`}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.filters} accessibilityRole="radiogroup" accessibilityLabel="Saring notifikasi">
        {(Object.keys(FILTER_LABEL) as Filter[]).map((nilai) => {
          const dipilih = nilai === filter;
          return (
            <Pressable
              key={nilai}
              accessibilityRole="radio"
              accessibilityState={{ selected: dipilih }}
              onPress={() => {
                setFilter(nilai);
                setHalaman(1);
              }}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  backgroundColor: dipilih ? theme.primary : theme.backgroundElement,
                  borderColor: dipilih ? theme.primary : theme.border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}>
              <ThemedText selectable type="smallBold" style={{ color: dipilih ? theme.onPrimary : theme.text }}>
                {FILTER_LABEL[nilai]}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.actions}>
        <AppButton
          label="Tandai semua dibaca"
          variant="secondary"
          disabled={sibuk || (data?.jumlah_belum_dibaca ?? 0) === 0}
          loading={sibuk}
          onPress={() => void tandaiSemua()}
        />
        <AppButton
          label="Perangkat & push"
          variant="secondary"
          onPress={() => router.push('/notifikasi/perangkat')}
        />
      </View>

      {loading && data === null ? (
        <LoadingState label="Memuat notifikasi…" />
      ) : error && data === null ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : data && data.items.length === 0 ? (
        <EmptyState
          title="Belum ada notifikasi"
          message={
            filter === 'belum_dibaca'
              ? 'Semua notifikasi Anda sudah dibaca.'
              : 'Pemberitahuan pengajuan, penetapan murobi, keputusan, pembatalan, dan koreksi akan tampil di sini.'
          }
        />
      ) : (
        <View style={styles.list}>
          {error ? (
            <ThemedText selectable themeColor="danger" type="small">
              {error}
            </ThemedText>
          ) : null}
          {data?.items.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.judul}. ${item.dibaca ? 'Sudah dibaca' : 'Belum dibaca'}`}
              onPress={() => buka(item)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: item.dibaca ? theme.border : theme.primary,
                  borderLeftWidth: item.dibaca ? 1 : 4,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}>
              <View style={styles.cardTop}>
                <ThemedText selectable type="small" themeColor="textSecondary">
                  {item.event_label}
                </ThemedText>
                {!item.dibaca ? (
                  <View style={[styles.dot, { backgroundColor: theme.primary }]} accessibilityLabel="Belum dibaca" />
                ) : null}
              </View>
              <ThemedText selectable type="smallBold">
                {item.judul}
              </ThemedText>
              <ThemedText selectable type="small">
                {item.isi}
              </ThemedText>
              <ThemedText selectable type="small" themeColor="textSecondary">
                {item.dibuat_pada}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      )}

      {totalHalaman > 1 ? (
        <View style={styles.pagination}>
          <AppButton
            label="Sebelumnya"
            variant="secondary"
            disabled={halaman <= 1}
            onPress={() => setHalaman((n) => Math.max(1, n - 1))}
          />
          <ThemedText selectable type="small" themeColor="textSecondary">
            Halaman {pagination?.current_page ?? halaman} dari {totalHalaman}
          </ThemedText>
          <AppButton
            label="Berikutnya"
            variant="secondary"
            disabled={halaman >= totalHalaman}
            onPress={() => setHalaman((n) => n + 1)}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 110, gap: 12, maxWidth: 760, width: '100%', alignSelf: 'center' },
  header: { gap: 4 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  filterChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  list: { gap: 10 },
  card: { borderWidth: 1, borderRadius: 16, borderCurve: 'continuous', padding: 14, gap: 4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 8 },
});
