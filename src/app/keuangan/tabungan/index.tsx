import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { keuangan } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { waktuPendek } from '@/components/kesehatan-shared';
import { Halaman, Penomoran } from '@/components/keuangan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { SearchField } from '@/components/ui/app-field';
import { Badge, Chip, ChipRow } from '@/components/ui/chip';
import { DateField } from '@/components/ui/date-field';
import { Card } from '@/components/ui/surface';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { labelJenis, rupiah } from '@/keuangan/forms';

/** Mutasi tabungan sah lintas santri (petugas: cakupannya; admin: semua; orang tua: 403 dari server). */
export default function MutasiScreen() {
  const { profile } = useAuth();
  return <Daftar key={profile?.id} />;
}

const JENIS = [['', 'Semua'], ['Setoran', 'Setoran'], ['Penarikan', 'Penarikan'], ['Belanja', 'Belanja'], ['PembayaranTagihan', 'Bayar tagihan'], ['Pembalik', 'Koreksi']] as const;

function Daftar() {
  const router = useRouter();
  const [jenis, setJenis] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [q, setQ] = useState('');
  const [terapan, setTerapan] = useState({ q: '', tanggal: '' });
  const [page, setPage] = useState(1);
  const fetcher = useCallback(() => keuangan.mutasi({ jenis, tanggal: terapan.tanggal, q: terapan.q }, page), [jenis, terapan, page]);
  const { data, error, load } = usePrivateResource(fetcher);
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  return (
    <Halaman>
      <SearchField label="Cari nama atau NIS" accessibilityLabel="Cari nama atau NIS" value={q} onChangeText={setQ} onSubmitEditing={() => { setTerapan({ q: q.trim(), tanggal }); setPage(1); }} autoCorrect={false} autoComplete="off" />
      <DateField label="Tanggal" value={tanggal} placeholder="Semua tanggal" onChange={setTanggal} />
      <AppButton label="Terapkan" size="sm" variant="secondary" icon="filter" onPress={() => { setTerapan({ q: q.trim(), tanggal }); setPage(1); }} />
      <ChipRow>{JENIS.map(([v, l]) => <Chip key={v} label={l} accessibilityRole="radio" selected={jenis === v} onPress={() => { setJenis(v); setPage(1); }} />)}</ChipRow>
      {!data ? <LoadingState label="Memuat mutasi…" /> : (
        <>
          <ThemedText type="caption" themeColor="textSecondary">{data.total} transaksi sah</ThemedText>
          {data.rows.length === 0 ? <EmptyState title="Belum ada mutasi" message="Tidak ada transaksi tabungan sah yang sesuai saringan." /> : null}
          {data.rows.map(x => (
            <Card key={x.id} accessibilityLabel={`Buka transaksi ${x.nomor_kuitansi}`} onPress={() => router.push({ pathname: '/keuangan/tabungan/[id]', params: { id: String(x.id) } })}>
              <View style={{ gap: 4 }}>
                <ThemedText type="bodyBold">{x.santri.nama} · {x.arah === 'Masuk' ? '+' : '−'}{rupiah(x.nominal)}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">{labelJenis(x.jenis)} · {x.metode} · {x.nomor_kuitansi} · {waktuPendek(x.waktu)}</ThemedText>
                <ThemedText>Saldo sesudah {rupiah(x.saldo_sesudah)}</ThemedText>
                {x.dikoreksi_oleh_id !== null ? <ChipRow><Badge label="Sudah dikoreksi" tone="warning" /></ChipRow> : null}
              </View>
            </Card>
          ))}
          <Penomoran page={data.page} total={data.total} perPage={data.per_page} onPage={setPage} />
        </>
      )}
    </Halaman>
  );
}
