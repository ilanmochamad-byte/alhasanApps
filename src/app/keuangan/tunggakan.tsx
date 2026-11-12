import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { keuangan } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { tanggalPanjang } from '@/components/kesehatan-shared';
import { BarisPil, Halaman, Penomoran } from '@/components/keuangan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { EntityRow } from '@/components/ui/entity-row';
import { FilterPills } from '@/components/ui/filter-pills';
import { HeroCard } from '@/components/ui/hero-card';
import { SearchBar } from '@/components/ui/search-bar';
import { StatusPill } from '@/components/ui/status-pill';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { labelPeriode, rupiah } from '@/keuangan/forms';

/** Tagihan terbit bersisa sesuai hak, dengan ringkasan dari kueri yang sama di server. */
export default function TunggakanScreen() {
  const { profile } = useAuth();
  return <Daftar key={profile?.id} />;
}

function Daftar() {
  const router = useRouter();
  const [unit, setUnit] = useState('');
  const [lewat, setLewat] = useState<'semua' | 'lewat'>('semua');
  const [q, setQ] = useState('');
  const [terapan, setTerapan] = useState('');
  const [page, setPage] = useState(1);
  const fetcher = useCallback(() => keuangan.tunggakan({ unit, lewat: lewat === 'lewat', q: terapan }, page), [unit, lewat, terapan, page]);
  const { data, error, load } = usePrivateResource(fetcher);
  return (
    <Halaman title="Tunggakan">
      {data ? (
        <HeroCard overline="Total sisa" value={rupiah(data.ringkasan.sisa)}
          caption={`${data.ringkasan.jumlah} tagihan · ${data.ringkasan.santri} santri${lewat === 'lewat' ? ' · lewat jatuh tempo' : ''}${unit ? ` · unit ${unit}` : ''}`} />
      ) : null}
      <SearchBar placeholder="Cari nama atau NIS" accessibilityLabel="Cari nama atau NIS" value={q} onChangeText={setQ}
        onSubmitEditing={() => { setTerapan(q.trim()); setPage(1); }} autoCorrect={false} autoComplete="off" />
      <FilterPills accessibilityLabel="Jatuh tempo" value={lewat} onChange={v => { setLewat(v); setPage(1); }}
        options={[{ value: 'semua', label: 'Semua' }, { value: 'lewat', label: 'Lewat jatuh tempo' }]} />
      {data && data.unit.length > 1 ? (
        <FilterPills accessibilityLabel="Unit" value={unit} onChange={v => { setUnit(v); setPage(1); }}
          options={[{ value: '', label: 'Semua unit' }, ...data.unit.map(u => ({ value: u, label: u }))]} />
      ) : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : !data ? <LoadingState label="Memuat tunggakan…" /> : (
        <>
          {data.rows.length === 0 ? <EmptyState icon="check-circle" title="Tidak ada tunggakan" message="Tidak ada tagihan bersisa yang sesuai saringan dan hak akses Anda." /> : null}
          {data.rows.map(r => (
            <EntityRow key={r.tagihan_id} avatarName={r.santri.nama} tone={r.lewat_jatuh_tempo ? 'danger' : 'warning'}
              title={r.santri.nama}
              subtitle={`${labelPeriode(r.periode)} · jatuh tempo ${tanggalPanjang(r.jatuh_tempo)}${r.santri.unit ? ` · ${r.santri.unit}` : ''}`}
              value={rupiah(r.sisa)} valueTone="danger" valueCaption={`dari ${rupiah(r.total)}`}
              pill={r.lewat_jatuh_tempo || r.menunggu_verifikasi > 0 ? (
                <BarisPil>
                  {r.lewat_jatuh_tempo ? <StatusPill tone="danger" icon="info" label="Lewat jatuh tempo" /> : null}
                  {r.menunggu_verifikasi > 0 ? <StatusPill tone="warning" icon="clock" label={`Transfer menunggu ${rupiah(r.menunggu_verifikasi)}`} /> : null}
                </BarisPil>
              ) : <ThemedText type="caption" themeColor="textSecondary">Belum lewat jatuh tempo</ThemedText>}
              accessibilityLabel={`Buka tagihan ${r.santri.nama} ${labelPeriode(r.periode)}`}
              onPress={() => router.push({ pathname: '/keuangan/tagihan/[id]', params: { id: String(r.tagihan_id) } })} />
          ))}
          <Penomoran page={data.page} total={data.total} perPage={data.per_page} onPage={setPage} />
        </>
      )}
    </Halaman>
  );
}
