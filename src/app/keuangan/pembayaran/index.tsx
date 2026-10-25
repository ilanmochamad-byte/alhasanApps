import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { keuangan } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { tanggalPanjang } from '@/components/kesehatan-shared';
import { Halaman, Penomoran, StatusBadge } from '@/components/keuangan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { SearchField } from '@/components/ui/app-field';
import { Chip, ChipRow } from '@/components/ui/chip';
import { Card } from '@/components/ui/surface';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { labelPeriode, rupiah } from '@/keuangan/forms';

/** Riwayat pembayaran tagihan sesuai hak; orang tua hanya anaknya, tanpa transfer menunggu (disaring server). */
export default function DaftarPembayaranScreen() {
  const { profile } = useAuth();
  return <Daftar key={profile?.id} />;
}

const STATUS = [['', 'Semua'], ['Menunggu', 'Menunggu'], ['Sah', 'Sah'], ['Dibatalkan', 'Dibatalkan']] as const;
const SUMBER = [['', 'Semua cara'], ['Tunai', 'Tunai'], ['Transfer', 'Transfer'], ['Tabungan', 'Tabungan']] as const;

function Daftar() {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [sumber, setSumber] = useState('');
  const [q, setQ] = useState('');
  const [terapan, setTerapan] = useState('');
  const [page, setPage] = useState(1);
  const fetcher = useCallback(() => keuangan.daftarPembayaran({ status, sumber, q: terapan }, page), [status, sumber, terapan, page]);
  const { data, error, load } = usePrivateResource(fetcher);
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  const wali = data?.akses.sumber === 'wali';
  return (
    <Halaman>
      {!wali ? (
        <>
          <SearchField label="Cari nama, NIS, atau nomor kuitansi" accessibilityLabel="Cari nama, NIS, atau nomor kuitansi" value={q} onChangeText={setQ} onSubmitEditing={() => { setTerapan(q.trim()); setPage(1); }} autoCorrect={false} autoComplete="off" />
          <ChipRow>{STATUS.map(([v, l]) => <Chip key={v} label={l} accessibilityRole="radio" selected={status === v} onPress={() => { setStatus(v); setPage(1); }} />)}</ChipRow>
        </>
      ) : null}
      <ChipRow>{SUMBER.map(([v, l]) => <Chip key={v} label={l} accessibilityRole="radio" selected={sumber === v} onPress={() => { setSumber(v); setPage(1); }} />)}</ChipRow>
      {!data ? <LoadingState label="Memuat pembayaran…" /> : (
        <>
          {data.rows.length === 0 ? <EmptyState title="Belum ada pembayaran" message="Tidak ada pembayaran yang sesuai saringan dan hak akses Anda." /> : null}
          {data.rows.map(b => (
            <Card key={b.id} accessibilityLabel={`Buka kuitansi ${b.nomor_kuitansi}`} onPress={() => router.push({ pathname: '/keuangan/pembayaran/[id]', params: { id: String(b.id) } })}>
              <View style={{ gap: 4 }}>
                <ThemedText type="bodyBold">{b.santri.nama} · {rupiah(b.nominal)}</ThemedText>
                <ChipRow><StatusBadge status={b.status} /></ChipRow>
                <ThemedText type="caption" themeColor="textSecondary">{b.nomor_kuitansi} · {labelPeriode(b.periode)} · {b.sumber === 'Tabungan' ? 'dari tabungan' : b.sumber} · {tanggalPanjang(b.tanggal_transaksi)}</ThemedText>
              </View>
            </Card>
          ))}
          <Penomoran page={data.page} total={data.total} perPage={data.per_page} onPage={setPage} />
        </>
      )}
    </Halaman>
  );
}
