import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { actionableError, api } from '@/api/client';
import type { Notifikasi, NotifikasiListResponse } from '@/api/types';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { IconButton } from '@/components/ui/icon-button';
import { Segmented } from '@/components/ui/segmented';
import { Card } from '@/components/ui/surface';
import { Radius } from '@/constants/theme';
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
        <View style={styles.headerRow}>
          <ThemedText selectable type="caption" themeColor="textSecondary" style={styles.headerText}>
            {data === null
              ? 'Memuat notifikasi…'
              : `${data.jumlah_belum_dibaca} belum dibaca dari ${pagination?.total ?? 0} notifikasi.`}
          </ThemedText>
          <IconButton
            icon="device"
            accessibilityLabel="Perangkat & push"
            onPress={() => router.push('/notifikasi/perangkat')}
          />
        </View>
        {pushState.status !== 'aktif' ? (
          <ThemedText selectable type="caption" themeColor="textMuted">
            {pushState.status === 'memeriksa'
              ? 'Memeriksa status push…'
              : `Push tidak aktif di perangkat ini. ${pushState.alasan} Notifikasi tetap tersedia di layar ini.`}
          </ThemedText>
        ) : null}
      </View>

      <Segmented
        accessibilityLabel="Saring notifikasi"
        value={filter}
        onChange={(nilai) => {
          setFilter(nilai);
          setHalaman(1);
        }}
        options={[
          { value: 'semua', label: FILTER_LABEL.semua },
          { value: 'belum_dibaca', label: FILTER_LABEL.belum_dibaca, count: data?.jumlah_belum_dibaca },
          { value: 'sudah_dibaca', label: FILTER_LABEL.sudah_dibaca },
        ]}
      />

      <AppButton
        label="Tandai semua dibaca"
        icon="check"
        variant="secondary"
        size="sm"
        disabled={sibuk || (data?.jumlah_belum_dibaca ?? 0) === 0}
        loading={sibuk}
        onPress={() => void tandaiSemua()}
      />

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
            <ThemedText selectable themeColor="danger" type="caption">
              {error}
            </ThemedText>
          ) : null}
          {data?.items.map((item) => (
            <Card
              key={item.id}
              accessibilityLabel={`${item.judul}. ${item.dibaca ? 'Sudah dibaca' : 'Belum dibaca'}`}
              onPress={() => buka(item)}
              style={[
                styles.card,
                { borderColor: item.dibaca ? theme.border : theme.primaryBorder },
              ]}>
              <View style={styles.cardRow}>
                <View
                  style={[
                    styles.cardIcon,
                    { backgroundColor: item.dibaca ? theme.backgroundElement : theme.primarySoft },
                  ]}>
                  <ThemedText
                    selectable
                    type="overline"
                    themeColor={item.dibaca ? 'textMuted' : 'primary'}>
                    {item.event_label.slice(0, 2).toUpperCase()}
                  </ThemedText>
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <ThemedText
                      selectable
                      type="label"
                      themeColor={item.dibaca ? 'textSecondary' : 'text'}
                      style={styles.cardTitle}>
                      {item.judul}
                    </ThemedText>
                    <ThemedText selectable type="overline" themeColor="textMuted" style={styles.cardTime}>
                      {item.dibuat_pada}
                    </ThemedText>
                  </View>
                  <ThemedText
                    selectable
                    type="caption"
                    themeColor={item.dibaca ? 'textMuted' : 'textSecondary'}>
                    {item.isi}
                  </ThemedText>
                  <ThemedText selectable type="overline" themeColor="textMuted" style={styles.cardEvent}>
                    {item.event_label}
                  </ThemedText>
                </View>
                {!item.dibaca ? (
                  <View
                    style={[styles.dot, { backgroundColor: theme.primary }]}
                    accessibilityLabel="Belum dibaca"
                  />
                ) : null}
              </View>
            </Card>
          ))}
        </View>
      )}

      {totalHalaman > 1 ? (
        <View style={styles.pagination}>
          <AppButton
            label="Sebelumnya"
            variant="secondary"
            size="sm"
            disabled={halaman <= 1}
            onPress={() => setHalaman((n) => Math.max(1, n - 1))}
          />
          <ThemedText selectable type="caption" themeColor="textSecondary">
            Halaman {pagination?.current_page ?? halaman} dari {totalHalaman}
          </ThemedText>
          <AppButton
            label="Berikutnya"
            variant="secondary"
            size="sm"
            disabled={halaman >= totalHalaman}
            onPress={() => setHalaman((n) => n + 1)}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 60, gap: 12, maxWidth: 760, width: '100%', alignSelf: 'center' },
  header: { gap: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerText: { flex: 1 },
  list: { gap: 10 },
  card: { padding: 13 },
  cardRow: { flexDirection: 'row', gap: 12 },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 3 },
  cardTop: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  cardTitle: { flex: 1 },
  cardTime: { letterSpacing: 0 },
  cardEvent: { letterSpacing: 0.3 },
  dot: { width: 8, height: 8, borderRadius: 999, marginTop: 6 },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 8,
  },
});
