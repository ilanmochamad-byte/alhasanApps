import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { actionableError, api } from '@/api/client';
import type { Notifikasi, NotifikasiListResponse } from '@/api/types';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import type { IconName } from '@/components/app-icon';
import type { HeaderMenuItem } from '@/components/screen-header';
import { StackScreen } from '@/components/screen-shell';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import type { AvatarTone } from '@/components/ui/avatar-inisial';
import { EntityRow } from '@/components/ui/entity-row';
import { FilterPills } from '@/components/ui/filter-pills';
import { Notice } from '@/components/ui/notice';
import { StatusPill } from '@/components/ui/status-pill';
import { Layout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { waktuRelatif } from '@/lib/tampilan';
import { useNotifications } from '@/notifications/notification-context';

type Filter = 'semua' | 'belum_dibaca' | 'sudah_dibaca';

/**
 * Ikon dan warna modul dari `tautan.tipe` yang dikirim server (penunjuk
 * sumber daya). Hanya hiasan pengenal; judul dan isi tetap teks server.
 */
function tampilanModul(tipe: string): { icon: IconName; tone: AvatarTone } {
  if (tipe.startsWith('bsa_')) return { icon: 'wallet', tone: 'warning' };
  if (tipe.startsWith('kesehatan')) return { icon: 'medical', tone: 'danger' };
  if (tipe === 'rapor') return { icon: 'book', tone: 'violet' };
  if (tipe === 'v3_publikasi') return { icon: 'users', tone: 'info' };
  return { icon: 'izin', tone: 'primary' };
}

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

  const belum = data?.jumlah_belum_dibaca ?? 0;
  // "Tandai semua dibaca" dan pintasan perangkat adalah tindakan sekunder (⋯).
  const menu: HeaderMenuItem[] = [
    ...(belum > 0 ? [{ label: 'Tandai semua dibaca', icon: 'check' as IconName, onPress: () => void tandaiSemua() }] : []),
    { label: 'Perangkat & push', icon: 'device', onPress: () => router.push('/notifikasi/perangkat') },
  ];

  return (
    <StackScreen title="Notifikasi" menu={menu}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.primary} />
        }>
        <ThemedText selectable type="caption" themeColor="textSecondary">
          {data === null
            ? 'Memuat notifikasi…'
            : `${data.jumlah_belum_dibaca} belum dibaca dari ${pagination?.total ?? 0} notifikasi.`}
        </ThemedText>
        {pushState.status !== 'aktif' ? (
          <Notice
            tone="neutral"
            text={
              pushState.status === 'memeriksa'
                ? 'Memeriksa status push…'
                : `Push tidak aktif di perangkat ini. ${pushState.alasan} Notifikasi tetap tersedia di layar ini.`
            }
          />
        ) : null}

        <FilterPills
          accessibilityLabel="Saring notifikasi"
          value={filter}
          onChange={(nilai) => {
            setFilter(nilai);
            setHalaman(1);
          }}
          options={[
            { value: 'semua', label: FILTER_LABEL.semua },
            { value: 'belum_dibaca', label: belum > 0 ? `${FILTER_LABEL.belum_dibaca} · ${belum > 99 ? '99+' : belum}` : FILTER_LABEL.belum_dibaca },
            { value: 'sudah_dibaca', label: FILTER_LABEL.sudah_dibaca },
          ]}
        />

        {sibuk ? <Notice tone="neutral" icon="check" text="Menandai semua notifikasi dibaca…" /> : null}

        {loading && data === null ? (
          <LoadingState label="Memuat notifikasi…" />
        ) : error && data === null ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : data && data.items.length === 0 ? (
          <EmptyState
            icon="bell"
            title="Belum ada notifikasi"
            message={
              filter === 'belum_dibaca'
                ? 'Semua notifikasi Anda sudah dibaca.'
                : 'Pemberitahuan pengajuan, penetapan murobi, keputusan, pembatalan, dan koreksi akan tampil di sini.'
            }
          />
        ) : (
          <View style={styles.list}>
            <Notice tone="danger" text={error} />
            {data?.items.map((item) => {
              const modul = tampilanModul(item.tautan.tipe);
              return (
                <EntityRow
                  key={item.id}
                  icon={modul.icon}
                  tone={modul.tone}
                  title={item.judul}
                  subtitle={`${item.event_label} · ${waktuRelatif(item.dibuat_pada)}`}
                  highlight={item.dibaca ? undefined : 'primary'}
                  accessibilityLabel={`${item.judul}. ${item.dibaca ? 'Sudah dibaca' : 'Belum dibaca'}`}
                  onPress={() => buka(item)}
                  detail={
                    <ThemedText selectable type="caption" themeColor="textSecondary">
                      {item.isi}
                    </ThemedText>
                  }
                  pill={item.dibaca ? undefined : <StatusPill label="Belum dibaca" tone="success" icon="bell" />}
                />
              );
            })}
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
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Layout.screen, paddingTop: 12, paddingBottom: 60, gap: 12, maxWidth: 760, width: '100%', alignSelf: 'center' },
  list: { gap: 10 },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 8,
  },
});
