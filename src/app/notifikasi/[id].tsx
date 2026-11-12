import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { actionableError, api } from '@/api/client';
import type { Notifikasi } from '@/api/types';
import { AppButton } from '@/components/app-button';
import { StackScreen } from '@/components/screen-shell';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { InfoRow } from '@/components/ui/info-row';
import { Notice } from '@/components/ui/notice';
import { Divider, Overline, Panel } from '@/components/ui/surface';
import { Layout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { useNotifications } from '@/notifications/notification-context';

const JUDUL = 'Rincian notifikasi';

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

  if (loading && data === null) return <StackScreen title={JUDUL}><LoadingState label="Membuka notifikasi…" /></StackScreen>;
  if (error && data === null) return <StackScreen title={JUDUL}><ErrorState message={error} onRetry={() => void load()} /></StackScreen>;
  if (data === null) return <StackScreen title={JUDUL}><ErrorState message="Notifikasi tidak tersedia." onRetry={() => void load()} /></StackScreen>;

  return (
    <StackScreen title={JUDUL}>
    <ScrollView
      contentInsetAdjustmentBehavior="never"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      {/* Kartu pesan. */}
      <Panel>
        <Overline>{data.event_label}</Overline>
        <ThemedText selectable type="h2" accessibilityRole="header">
          {data.judul}
        </ThemedText>
        <ThemedText selectable type="body">{data.isi}</ThemedText>
        <Divider />
        <View>
          {data.santri_nama ? <InfoRow icon="person" label="Santri" value={data.santri_nama} /> : null}
          {data.pengajuan_status ? (
            <InfoRow icon="izin" label="Status pengajuan saat ini" value={data.pengajuan_status} />
          ) : null}
          <InfoRow
            icon="clock"
            label="Diterima"
            value={`${data.dibuat_pada}${data.dibaca_pada ? ` · dibaca ${data.dibaca_pada}` : ''}`}
            last
          />
        </View>
      </Panel>

      <Notice
        tone="neutral"
        text="Notifikasi hanya memberi pemberitahuan. Buka detail untuk memeriksa informasi dan hak akses terbaru."
      />

      <View style={styles.actions}>
        {data.tautan.tipe === 'rapor' && data.tautan.rapor_id ? <AppButton label="Buka rapor semester" onPress={() => router.push({ pathname: '/rapor/[id]', params: { id: String(data.tautan.rapor_id) } })} /> : null}
        {data.pengajuan_id !== null ? (
          <AppButton
            label="Buka detail izin"
            onPress={() =>
              router.push({ pathname: '/izin/[id]', params: { id: String(data.pengajuan_id) } })
            }
          />
        ) : null}
        {data.tautan.tipe === 'izin_wali' && data.tautan.pengajuan_id ? (
          <AppButton label="Buka pengajuan izin" onPress={() => router.push({ pathname: '/izin-wali/[id]', params: { id: String(data.tautan.pengajuan_id) } })} />
        ) : null}
        {data.tautan.tipe === 'kesehatan_ringkasan' && data.tautan.ringkasan_id ? (
          <AppButton label="Buka informasi kesehatan" onPress={() => router.push({ pathname: '/kesehatan/wali/[id]', params: { id: String(data.tautan.ringkasan_id) } })} />
        ) : null}
        {data.tautan.tipe === 'bsa_tagihan' && data.tautan.tagihan_id ? (
          <AppButton label="Buka tagihan" onPress={() => router.push({ pathname: '/keuangan/tagihan/[id]', params: { id: String(data.tautan.tagihan_id) } })} />
        ) : null}
        {data.tautan.tipe === 'bsa_pembayaran' && data.tautan.pembayaran_id ? (
          <AppButton label="Buka kuitansi pembayaran" onPress={() => router.push({ pathname: '/keuangan/pembayaran/[id]', params: { id: String(data.tautan.pembayaran_id) } })} />
        ) : null}
        {data.tautan.tipe === 'bsa_tabungan' && data.tautan.transaksi_id ? (
          <AppButton label="Buka transaksi tabungan" onPress={() => router.push({ pathname: '/keuangan/tabungan/[id]', params: { id: String(data.tautan.transaksi_id) } })} />
        ) : null}
        {data.tautan.tipe === 'v3_publikasi' && data.tautan.publikasi_id ? (
          <AppButton label="Buka informasi pembinaan" onPress={() => router.push({ pathname: '/publikasi/[id]', params: { id: String(data.tautan.publikasi_id) } })} />
        ) : null}
      </View>
    </ScrollView>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Layout.screen, paddingTop: 12, paddingBottom: 60, gap: 14, maxWidth: 760, width: '100%', alignSelf: 'center' },
  actions: { gap: 10 },
});
