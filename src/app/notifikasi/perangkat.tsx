import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { actionableError, api } from '@/api/client';
import type { PerangkatPush } from '@/api/types';
import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { StackScreen } from '@/components/screen-shell';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Notice } from '@/components/ui/notice';
import { StatusPill } from '@/components/ui/status-pill';
import { Overline, Panel, SectionHeader } from '@/components/ui/surface';
import { Layout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useNotifications } from '@/notifications/notification-context';

/**
 * Perangkat push milik pengguna (PRD V2 Fase 4 §5.4-§5.5).
 *
 * Layar ini TIDAK PERNAH menampilkan token perangkat: server memang tidak
 * mengirimkannya. Yang tampil hanyalah platform, label perangkat, versi
 * aplikasi, dan status.
 *
 * Mematikan push di sini menghentikan pengiriman push ke perangkat tersebut
 * TANPA mempengaruhi notifikasi dalam aplikasi, yang tetap menjadi sumber
 * status utama.
 */
export default function PerangkatPushScreen() {
  const theme = useTheme();
  const { pushState, nyalakanPush, matikanPush } = useNotifications();

  const [items, setItems] = useState<PerangkatPush[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sibuk, setSibuk] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems((await api.perangkatList()).items);
    } catch (caught) {
      setError(actionableError(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function jalankan(operasi: () => Promise<unknown>) {
    if (sibuk) return;
    setSibuk(true);
    setError(null);
    try {
      await operasi();
      await load();
    } catch (caught) {
      setError(actionableError(caught));
    } finally {
      setSibuk(false);
    }
  }

  const pushAktifDiSini = pushState.status === 'aktif';

  return (
    <StackScreen title="Perangkat & push">
    <ScrollView
      contentInsetAdjustmentBehavior="never"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <Panel>
        <View style={styles.kepala}>
          <View style={[styles.ikon, { backgroundColor: pushAktifDiSini ? theme.primarySoft : theme.backgroundElement }]}>
            <AppIcon name="device" size={22} themeColor={pushAktifDiSini ? 'primary' : 'textSecondary'} />
          </View>
          <View style={styles.kepalaTeks}>
            <ThemedText selectable type="h2">
              Perangkat ini
            </ThemedText>
            <StatusPill
              label={pushAktifDiSini ? 'Push aktif' : pushState.status === 'memeriksa' ? 'Memeriksa…' : 'Push tidak aktif'}
              tone={pushAktifDiSini ? 'success' : 'neutral'}
              icon={pushAktifDiSini ? 'check' : 'clock'}
            />
          </View>
        </View>
        <ThemedText selectable type="labelSmall" themeColor={pushAktifDiSini || pushState.status === 'memeriksa' ? 'textSecondary' : 'danger'}>
          {pushState.status === 'aktif'
            ? 'Push aktif. Perangkat ini akan menerima pemberitahuan perizinan.'
            : pushState.status === 'memeriksa'
              ? 'Memeriksa status push…'
              : pushState.alasan}
        </ThemedText>
        <ThemedText selectable type="caption" themeColor="textSecondary">
          Push jarak jauh hanya bekerja pada perangkat nyata dari build EAS yang ditandatangani dengan
          credential push. Expo Go, emulator, dan simulator tidak didukung.
        </ThemedText>
        {pushAktifDiSini ? (
          <AppButton
            label="Matikan push di perangkat ini"
            variant="outline"
            disabled={sibuk}
            onPress={() => void jalankan(matikanPush)}
          />
        ) : (
          <AppButton
            label="Nyalakan push"
            disabled={sibuk || pushState.status === 'memeriksa'}
            onPress={() => void jalankan(nyalakanPush)}
          />
        )}
      </Panel>

      <Notice tone="danger" text={error} />

      <SectionHeader title="Seluruh perangkat akun ini" />

      {loading && items === null ? (
        <LoadingState label="Memuat daftar perangkat…" />
      ) : error && items === null ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : items && items.length === 0 ? (
        <EmptyState
          icon="device"
          title="Belum ada perangkat terdaftar"
          message="Nyalakan push pada perangkat ini agar terdaftar menerima pemberitahuan."
        />
      ) : (
        <View style={styles.list}>
          {items?.map((perangkat) => (
            <Panel key={perangkat.id}>
              <Overline>{perangkat.platform}</Overline>
              <ThemedText selectable type="bodyBold">
                {perangkat.device_label ?? 'Perangkat tanpa nama'} · {perangkat.platform}
              </ThemedText>
              <StatusPill
                label={
                  perangkat.dicabut
                    ? `Dicabut${perangkat.alasan_pencabutan ? ` (${perangkat.alasan_pencabutan})` : ''}`
                    : perangkat.push_aktif
                      ? 'Push aktif'
                      : 'Push dimatikan'
                }
                tone={perangkat.dicabut ? 'danger' : perangkat.push_aktif ? 'success' : 'neutral'}
                icon={perangkat.dicabut ? 'close' : perangkat.push_aktif ? 'check' : 'clock'}
              />
              <ThemedText selectable type="caption" themeColor="textSecondary">
                {perangkat.app_version ? `Versi ${perangkat.app_version} · ` : ''}Terdaftar {perangkat.terdaftar_pada}
                {perangkat.terakhir_aktif_pada ? ` · terakhir aktif ${perangkat.terakhir_aktif_pada}` : ''}
              </ThemedText>
              {!perangkat.dicabut ? (
                <View style={styles.actions}>
                  <AppButton
                    label={perangkat.push_aktif ? 'Matikan push' : 'Nyalakan push'}
                    variant="secondary"
                    size="sm"
                    style={styles.aksi}
                    disabled={sibuk}
                    onPress={() =>
                      void jalankan(() => api.perangkatSetPush(perangkat.id, !perangkat.push_aktif))
                    }
                  />
                  <AppButton
                    label="Hapus perangkat"
                    variant="outline"
                    size="sm"
                    style={styles.aksi}
                    disabled={sibuk}
                    onPress={() =>
                      void jalankan(() =>
                        api.perangkatCabut({ perangkat_id: perangkat.id, alasan: 'perangkat_dihapus' }),
                      )
                    }
                  />
                </View>
              ) : null}
            </Panel>
          ))}
        </View>
      )}

      <Notice
        tone="neutral"
        icon="lock"
        text="Token perangkat tidak pernah ditampilkan di layar ini maupun dikirim kembali oleh server. Mematikan push tidak mempengaruhi notifikasi dalam aplikasi."
      />
    </ScrollView>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Layout.screen, paddingTop: 12, paddingBottom: 60, gap: 14, maxWidth: 760, width: '100%', alignSelf: 'center' },
  kepala: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kepalaTeks: { flex: 1, gap: 4 },
  ikon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  list: { gap: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 6 },
  aksi: { flexGrow: 1 },
});
