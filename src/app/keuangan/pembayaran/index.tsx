import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { keuangan } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { tanggalPanjang } from '@/components/kesehatan-shared';
import { Halaman, Penomoran, StatusBadge } from '@/components/keuangan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { EntityRow } from '@/components/ui/entity-row';
import { FilterPills } from '@/components/ui/filter-pills';
import { SearchBar } from '@/components/ui/search-bar';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { labelPeriode, rupiah } from '@/keuangan/forms';

/**
 * Riwayat pembayaran tagihan sesuai hak (pola P-Daftar, gaya "kuitansi");
 * orang tua hanya anaknya, tanpa transfer menunggu (disaring server).
 */
export default function DaftarPembayaranScreen() {
  const { profile } = useAuth();
  return <Daftar key={profile?.id} />;
}

type Status = '' | 'Menunggu' | 'Sah' | 'Dibatalkan';
type Sumber = '' | 'Tunai' | 'Transfer' | 'Tabungan';
const STATUS: { value: Status; label: string }[] = [{ value: '', label: 'Semua' }, { value: 'Menunggu', label: 'Menunggu' }, { value: 'Sah', label: 'Sah' }, { value: 'Dibatalkan', label: 'Dibatalkan' }];
const SUMBER: { value: Sumber; label: string }[] = [{ value: '', label: 'Semua cara' }, { value: 'Tunai', label: 'Tunai' }, { value: 'Transfer', label: 'Transfer' }, { value: 'Tabungan', label: 'Tabungan' }];

function Daftar() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('');
  const [sumber, setSumber] = useState<Sumber>('');
  const [q, setQ] = useState('');
  const [terapan, setTerapan] = useState('');
  const [page, setPage] = useState(1);
  const fetcher = useCallback(() => keuangan.daftarPembayaran({ status, sumber, q: terapan }, page), [status, sumber, terapan, page]);
  const { data, error, load } = usePrivateResource(fetcher);
  const wali = data?.akses.sumber === 'wali';
  return (
    <Halaman title="Pembayaran tagihan">
      {!wali ? (
        <>
          <SearchBar placeholder="Cari nama, NIS, atau nomor kuitansi" accessibilityLabel="Cari nama, NIS, atau nomor kuitansi" value={q} onChangeText={setQ}
            onSubmitEditing={() => { setTerapan(q.trim()); setPage(1); }} autoCorrect={false} autoComplete="off" />
          <FilterPills accessibilityLabel="Status pembayaran" value={status} onChange={v => { setStatus(v); setPage(1); }} options={STATUS} />
        </>
      ) : null}
      <FilterPills accessibilityLabel="Cara pembayaran" value={sumber} onChange={v => { setSumber(v); setPage(1); }} options={SUMBER} />
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : !data ? <LoadingState label="Memuat pembayaran…" /> : (
        <>
          <ThemedText selectable type="caption" themeColor="textSecondary">{data.total} pembayaran</ThemedText>
          {data.rows.length === 0 ? <EmptyState icon="check-circle" title="Belum ada pembayaran" message="Tidak ada pembayaran yang sesuai saringan dan hak akses Anda." /> : null}
          {data.rows.map(b => (
            <EntityRow key={b.id} icon={b.status === 'Menunggu' ? 'clock' : b.status === 'Dibatalkan' ? 'close' : 'check-circle'}
              tone={b.status === 'Menunggu' ? 'warning' : b.status === 'Dibatalkan' ? 'danger' : 'primary'}
              title={b.santri.nama}
              subtitle={`${b.nomor_kuitansi} · ${labelPeriode(b.periode)}`}
              value={rupiah(b.nominal)}
              valueCaption={b.sumber === 'Tabungan' ? 'dari tabungan' : b.sumber}
              detail={<ThemedText selectable type="caption" themeColor="textSecondary">{tanggalPanjang(b.tanggal_transaksi)}</ThemedText>}
              pill={<StatusBadge status={b.status} />}
              accessibilityLabel={`Buka kuitansi ${b.nomor_kuitansi}`}
              onPress={() => router.push({ pathname: '/keuangan/pembayaran/[id]', params: { id: String(b.id) } })} />
          ))}
          <Penomoran page={data.page} total={data.total} perPage={data.per_page} onPage={setPage} />
        </>
      )}
    </Halaman>
  );
}
