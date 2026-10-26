import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { keuangan } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { Pesan, tanggalPanjang } from '@/components/kesehatan-shared';
import { Halaman, Penomoran } from '@/components/keuangan-shared';
import { SetoranTransferKartu } from '@/components/keuangan-setoran';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Card, Panel } from '@/components/ui/surface';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { labelPeriode, rupiah } from '@/keuangan/forms';

/**
 * Antrean transfer yang menunggu verifikasi: setoran tabungan dan pembayaran
 * tagihan. Admin hanya melihat; Petugas BSA memverifikasi atau menolak.
 */
export default function VerifikasiScreen() {
  const { profile } = useAuth();
  return <Antrean key={profile?.id} />;
}

function Antrean() {
  const router = useRouter();
  const [halSetoran, setHalSetoran] = useState(1);
  const [pesan, setPesan] = useState<string | null>(null);
  const fetcher = useCallback(async () => {
    const [setoran, bayar] = await Promise.all([
      keuangan.setoranTransfer('Menunggu', '', halSetoran),
      keuangan.daftarPembayaran({ status: 'Menunggu', sumber: 'Transfer' }, 1),
    ]);
    return { setoran, bayar };
  }, [halSetoran]);
  const { data, error, load, reject } = usePrivateResource(fetcher);
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState label="Memuat antrean transfer…" />;
  const kelola = data.setoran.akses.kelola;
  return (
    <Halaman>
      <Pesan text={pesan} tone="success" />
      <Panel style={{ gap: 10 }}>
        <ThemedText type="h3">Setoran tabungan ({data.setoran.total})</ThemedText>
        {data.setoran.rows.length === 0 ? <EmptyState title="Tidak ada setoran menunggu" message="Semua setoran transfer sudah diputus." /> : null}
        {data.setoran.rows.map(s => (
          <SetoranTransferKartu onDenied={reject} key={s.id} s={s} kelola={kelola} santri={`${s.santri.nama} · NIS ${s.santri.nis}`} onSelesai={p => { setPesan(p); void load(); }} />
        ))}
        <Penomoran page={data.setoran.page} total={data.setoran.total} perPage={data.setoran.per_page} onPage={setHalSetoran} />
      </Panel>
      <Panel style={{ gap: 10 }}>
        <ThemedText type="h3">Pembayaran tagihan ({data.bayar.total})</ThemedText>
        {data.bayar.rows.length === 0 ? <EmptyState title="Tidak ada pembayaran menunggu" message="Semua transfer pembayaran sudah diputus." /> : null}
        {data.bayar.rows.map(b => (
          <Card key={b.id} accessibilityLabel={`Buka pembayaran ${b.nomor_kuitansi}`} onPress={() => router.push({ pathname: '/keuangan/pembayaran/[id]', params: { id: String(b.id) } })}>
            <View style={{ gap: 4 }}>
              <ThemedText type="bodyBold">{b.santri.nama} · {rupiah(b.nominal)}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">{b.nomor_kuitansi} · tagihan {labelPeriode(b.periode)} · {tanggalPanjang(b.tanggal_transaksi)}</ThemedText>
              {kelola ? <ThemedText type="caption" themeColor="primary">Ketuk untuk memverifikasi atau menolak</ThemedText> : null}
            </View>
          </Card>
        ))}
        {data.bayar.total > data.bayar.rows.length ? <ThemedText type="caption" themeColor="textSecondary">Menampilkan {data.bayar.rows.length} dari {data.bayar.total}; buka Pembayaran tagihan untuk seluruhnya.</ThemedText> : null}
      </Panel>
    </Halaman>
  );
}
