import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { actionableError, api } from '@/api/client';
import type { Notifikasi } from '@/api/types';
import { AppButton } from '@/components/app-button';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useNotifications } from '@/notifications/notification-context';

/**
 * Detail satu notifikasi.
 *
 * Membuka layar ini sekaligus menandai notifikasi sudah dibaca. Server hanya
 * menerima id milik akun yang sedang masuk; id milik pengguna lain dijawab 403
 * dan layar menampilkan pesan penolakan, bukan isi notifikasi.
 *
 * Tombol "Buka detail izin" hanya membawa ID. Layar detail izin memanggil
 * server lagi, yang memeriksa cakupan pengguna sebelum menampilkan apa pun —
 * ID pada payload notifikasi tidak pernah dipercaya sebagai bukti hak akses.
 */
export default function NotifikasiDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { segarkanJumlah } = useNotifications();

  const notifikasiId = Number(id);
  const [data, setData] = useState<Notifikasi | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!Number.isInteger(notifikasiId) || notifikasiId < 1) {
        throw new Error('Notifikasi tidak valid.');
      }
      // Menandai dibaca mengembalikan notifikasi terbaru sekaligus, sehingga
      // tidak perlu dua permintaan.
      const hasil = await api.notifikasiTandaiDibaca(notifikasiId);
      setData(hasil.notifikasi);
      await segarkanJumlah();
    } catch (caught) {
      setError(actionableError(caught));
    } finally {
      setLoading(false);
    }
  }, [notifikasiId, segarkanJumlah]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading && data === null) return <LoadingState label="Membuka notifikasi…" />;
  if (error && data === null) return <ErrorState message={error} onRetry={() => void load()} />;
  if (data === null) return <ErrorState message="Notifikasi tidak tersedia." onRetry={() => void load()} />;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <ThemedText selectable type="small" themeColor="textSecondary">
          {data.event_label}
        </ThemedText>
        <ThemedText selectable style={styles.judul}>
          {data.judul}
        </ThemedText>
        <ThemedText selectable>{data.isi}</ThemedText>
        {data.santri_nama ? (
          <ThemedText selectable type="small" themeColor="textSecondary">
            Santri: {data.santri_nama}
          </ThemedText>
        ) : null}
        {data.pengajuan_status ? (
          <ThemedText selectable type="small" themeColor="textSecondary">
            Status pengajuan saat ini: {data.pengajuan_status}
          </ThemedText>
        ) : null}
        <ThemedText selectable type="small" themeColor="textSecondary">
          Diterima {data.dibuat_pada}
          {data.dibaca_pada ? ` · dibaca ${data.dibaca_pada}` : ''}
        </ThemedText>
      </View>

      <ThemedText selectable type="small" themeColor="textSecondary">
        Alasan izin dan catatan pengurus tidak pernah dikirim melalui notifikasi. Buka detail izin untuk
        membacanya.
      </ThemedText>

      <View style={styles.actions}>
        {data.pengajuan_id !== null ? (
          <AppButton
            label="Buka detail izin"
            onPress={() =>
              router.push({ pathname: '/izin/[id]', params: { id: String(data.pengajuan_id) } })
            }
          />
        ) : null}
        <AppButton label="Kembali" variant="secondary" onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 60, gap: 14, maxWidth: 760, width: '100%', alignSelf: 'center' },
  card: { borderWidth: 1, borderRadius: 18, borderCurve: 'continuous', padding: 16, gap: 6 },
  judul: { fontSize: 19, lineHeight: 25, fontWeight: '800' },
  actions: { gap: 10 },
});
