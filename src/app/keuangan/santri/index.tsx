import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { keuangan } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { Halaman, Penomoran, TombolCari } from '@/components/keuangan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { EntityRow } from '@/components/ui/entity-row';
import { SearchBar } from '@/components/ui/search-bar';
import { StatusPill } from '@/components/ui/status-pill';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { rupiah } from '@/keuangan/forms';

/** Santri sesuai hak (petugas: cakupan unit; admin: semua; orang tua: anak) beserta saldo dan sisa tagihan. */
export default function SantriScreen() {
  const { profile } = useAuth();
  return <Daftar key={profile?.id} />;
}

function Daftar() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [terapan, setTerapan] = useState('');
  const [page, setPage] = useState(1);
  const fetcher = useCallback(() => keuangan.daftarSantri(terapan, page), [terapan, page]);
  const { data, error, load } = usePrivateResource(fetcher);
  const cari = () => { setTerapan(q.trim()); setPage(1); };
  return (
    <Halaman title="Santri & saldo">
      <SearchBar placeholder="Cari nama atau NIS" accessibilityLabel="Cari nama atau NIS" value={q} onChangeText={setQ} onSubmitEditing={cari}
        autoCorrect={false} autoComplete="off" trailing={<TombolCari onPress={cari} />} />
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : !data ? <LoadingState label="Memuat santri…" /> : (
        <>
          <ThemedText selectable type="caption" themeColor="textSecondary">{data.total} santri</ThemedText>
          {data.rows.length === 0 ? <EmptyState icon="users" title="Tidak ada santri" message="Tidak ada santri yang sesuai pencarian dan hak akses Anda." /> : null}
          {data.rows.map(s => (
            <EntityRow key={s.id} avatarName={s.nama} title={s.nama}
              subtitle={`NIS ${s.nis}${s.kelas ? ` · ${s.kelas}` : ''}${s.unit ? ` · ${s.unit}` : ''}`}
              value={rupiah(s.saldo)} valueCaption="Saldo"
              pill={s.sisa_tagihan > 0
                ? <StatusPill tone="warning" icon="wallet" label={`Tunggakan ${rupiah(s.sisa_tagihan)} (${s.tagihan_terbuka})`} />
                : <StatusPill tone="success" label="Tanpa sisa tagihan" />}
              accessibilityLabel={`Buka keuangan ${s.nama}`}
              onPress={() => router.push({ pathname: '/keuangan/santri/[id]', params: { id: String(s.id) } })} />
          ))}
          <Penomoran page={data.page} total={data.total} perPage={data.per_page} onPage={setPage} />
        </>
      )}
    </Halaman>
  );
}
