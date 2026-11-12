import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { keuangan } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { tanggalPanjang, waktuPendek } from '@/components/kesehatan-shared';
import { Halaman, Penomoran } from '@/components/keuangan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { DateField } from '@/components/ui/date-field';
import { EntityRow } from '@/components/ui/entity-row';
import { FilterPills } from '@/components/ui/filter-pills';
import { SearchBar } from '@/components/ui/search-bar';
import { StatusPill } from '@/components/ui/status-pill';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { labelJenis, nominalBertanda, putaranArah, rupiah } from '@/keuangan/forms';

/** Mutasi tabungan sah lintas santri (petugas: cakupannya; admin: semua; orang tua: 403 dari server). */
export default function MutasiScreen() {
  const { profile } = useAuth();
  return <Daftar key={profile?.id} />;
}

type Jenis = '' | 'Setoran' | 'Penarikan' | 'Belanja' | 'PembayaranTagihan' | 'Pembalik';
const JENIS: { value: Jenis; label: string }[] = [
  { value: '', label: 'Semua' }, { value: 'Setoran', label: 'Setoran' }, { value: 'Penarikan', label: 'Penarikan' },
  { value: 'Belanja', label: 'Belanja' }, { value: 'PembayaranTagihan', label: 'Bayar tagihan' }, { value: 'Pembalik', label: 'Koreksi' },
];

function Daftar() {
  const router = useRouter();
  const [jenis, setJenis] = useState<Jenis>('');
  const [tanggal, setTanggal] = useState('');
  const [q, setQ] = useState('');
  const [terapan, setTerapan] = useState({ q: '', tanggal: '' });
  const [page, setPage] = useState(1);
  const fetcher = useCallback(() => keuangan.mutasi({ jenis, tanggal: terapan.tanggal, q: terapan.q }, page), [jenis, terapan, page]);
  const { data, error, load } = usePrivateResource(fetcher);
  const terapkan = () => { setTerapan({ q: q.trim(), tanggal }); setPage(1); };
  return (
    <Halaman title="Mutasi tabungan">
      <SearchBar placeholder="Cari nama atau NIS" accessibilityLabel="Cari nama atau NIS" value={q} onChangeText={setQ} onSubmitEditing={terapkan}
        autoCorrect={false} autoComplete="off" filterTitle="Saring tanggal" filterActive={Boolean(terapan.tanggal)}
        filter={tutup => (
          <>
            <DateField label="Tanggal" value={tanggal} placeholder="Semua tanggal" onChange={setTanggal} />
            <AppButton label="Terapkan" icon="filter" onPress={() => { terapkan(); tutup(); }} />
            {tanggal ? <AppButton label="Semua tanggal" variant="secondary" onPress={() => { setTanggal(''); setTerapan({ q: q.trim(), tanggal: '' }); setPage(1); tutup(); }} /> : null}
          </>
        )} />
      <FilterPills accessibilityLabel="Jenis transaksi" value={jenis} onChange={v => { setJenis(v); setPage(1); }} options={JENIS} />
      {terapan.tanggal ? <StatusPill tone="info" icon="calendar" label={`Tanggal ${tanggalPanjang(terapan.tanggal)}`} /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : !data ? <LoadingState label="Memuat mutasi…" /> : (
        <>
          <ThemedText selectable type="caption" themeColor="textSecondary">{data.total} transaksi sah</ThemedText>
          {data.rows.length === 0 ? <EmptyState icon="wallet" title="Belum ada mutasi" message="Tidak ada transaksi tabungan sah yang sesuai saringan." /> : null}
          {data.rows.map(x => (
            <EntityRow key={x.id} icon="arrow-right" iconRotate={putaranArah(x.arah)} tone={x.arah === 'Masuk' ? 'primary' : 'warning'}
              title={x.santri.nama}
              subtitle={`${labelJenis(x.jenis)} · ${x.metode} · ${waktuPendek(x.waktu)}`}
              value={nominalBertanda(x.arah, x.nominal)} valueTone={x.arah === 'Masuk' ? 'primary' : 'warning'}
              valueCaption={`Saldo ${rupiah(x.saldo_sesudah)}`}
              detail={<ThemedText selectable type="caption" themeColor="textSecondary">{x.nomor_kuitansi}</ThemedText>}
              pill={x.dikoreksi_oleh_id !== null ? <StatusPill tone="warning" icon="refresh" label="Sudah dikoreksi" /> : undefined}
              accessibilityLabel={`Buka transaksi ${x.nomor_kuitansi}`}
              onPress={() => router.push({ pathname: '/keuangan/tabungan/[id]', params: { id: String(x.id) } })} />
          ))}
          <Penomoran page={data.page} total={data.total} perPage={data.per_page} onPage={setPage} />
        </>
      )}
    </Halaman>
  );
}
