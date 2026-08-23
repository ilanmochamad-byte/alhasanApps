import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { actionableError, api } from '@/api/client';
import type { PerangkatPush } from '@/api/types';
import { AppButton } from '@/components/app-button';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
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
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <ThemedText selectable style={styles.judul}>
          Perangkat ini
        </ThemedText>
        <ThemedText selectable type="small" themeColor={pushAktifDiSini ? 'textSecondary' : 'danger'}>
          {pushState.status === 'aktif'
            ? 'Push aktif. Perangkat ini akan menerima pemberitahuan perizinan.'
            : pushState.status === 'memeriksa'
              ? 'Memeriksa status push…'
              : pushState.alasan}
        </ThemedText>
        <ThemedText selectable type="small" themeColor="textSecondary">
          Push jarak jauh memerlukan development build dan perangkat nyata. Expo Go, emulator, dan simulator
          tidak menerima push.
        </ThemedText>
        <View style={styles.actions}>
          {pushAktifDiSini ? (
            <AppButton
              label="Matikan push di perangkat ini"
              variant="danger"
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
        </View>
      </View>

      {error ? (
        <ThemedText selectable themeColor="danger" type="small">
          {error}
        </ThemedText>
      ) : null}

      <ThemedText selectable style={styles.judul}>
        Seluruh perangkat akun ini
      </ThemedText>

      {loading && items === null ? (
        <LoadingState label="Memuat daftar perangkat…" />
      ) : error && items === null ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : items && items.length === 0 ? (
        <EmptyState
          title="Belum ada perangkat terdaftar"
          message="Nyalakan push pada perangkat ini agar terdaftar menerima pemberitahuan."
        />
      ) : (
        <View style={styles.list}>
          {items?.map((perangkat) => (
            <View
              key={perangkat.id}
              style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText selectable type="smallBold">
                {perangkat.device_label ?? 'Perangkat tanpa nama'} · {perangkat.platform}
              </ThemedText>
              <ThemedText selectable type="small" themeColor="textSecondary">
                {perangkat.dicabut
                  ? `Dicabut${perangkat.alasan_pencabutan ? ` (${perangkat.alasan_pencabutan})` : ''}`
                  : perangkat.push_aktif
                    ? 'Push aktif'
                    : 'Push dimatikan'}
                {perangkat.app_version ? ` · versi ${perangkat.app_version}` : ''}
              </ThemedText>
              <ThemedText selectable type="small" themeColor="textSecondary">
                Terdaftar {perangkat.terdaftar_pada}
                {perangkat.terakhir_aktif_pada ? ` · terakhir aktif ${perangkat.terakhir_aktif_pada}` : ''}
              </ThemedText>
              {!perangkat.dicabut ? (
                <View style={styles.actions}>
                  <AppButton
                    label={perangkat.push_aktif ? 'Matikan push' : 'Nyalakan push'}
                    variant="secondary"
                    disabled={sibuk}
                    onPress={() =>
                      void jalankan(() => api.perangkatSetPush(perangkat.id, !perangkat.push_aktif))
                    }
                  />
                  <AppButton
                    label="Hapus perangkat"
                    variant="danger"
                    disabled={sibuk}
                    onPress={() =>
                      void jalankan(() =>
                        api.perangkatCabut({ perangkat_id: perangkat.id, alasan: 'perangkat_dihapus' }),
                      )
                    }
                  />
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}

      <ThemedText selectable type="small" themeColor="textSecondary">
        Token perangkat tidak pernah ditampilkan di layar ini maupun dikirim kembali oleh server. Mematikan
        push tidak mempengaruhi notifikasi dalam aplikasi.
      </ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 60, gap: 14, maxWidth: 760, width: '100%', alignSelf: 'center' },
  card: { borderWidth: 1, borderRadius: 18, borderCurve: 'continuous', padding: 16, gap: 6 },
  judul: { fontSize: 18, lineHeight: 24, fontWeight: '800' },
  list: { gap: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 6 },
});
