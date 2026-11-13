import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { keamanan } from '@/api/keamanan';
import { Pager } from '@/components/izin-wali-shared';
import { waktuPendek } from '@/components/kesehatan-shared';
import { BarisPilIsi, TombolMuatUlangKepala } from '@/components/halaman-stack';
import { CatatanHanyaBaca, Halaman, KolomCariSantri, Lencana } from '@/components/keamanan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { EntityRow } from '@/components/ui/entity-row';
import { FilterPills } from '@/components/ui/filter-pills';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { nadaPembinaan, STATUS_PELANGGARAN } from '@/keamanan/format';

/** Pelanggaran seluruh santri aktif, hanya baca. Chip, pencarian, dan daftar memakai cakupan server yang sama. */
export default function KeamananPelanggaranScreen() {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [cari, setCari] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const fetcher = useCallback(() => keamanan.pelanggaran({ status, q, page }), [status, q, page]);
  const { data, error, load } = usePrivateResource(fetcher);
  const jumlah = data?.jumlah_status ?? {};
  const semua = Object.values(jumlah).reduce((a, b) => a + b, 0);
  return (
    <Halaman title="Pelanggaran" subtitle="Hanya melihat" actions={<TombolMuatUlangKepala onPress={() => void load()} />}>
      <KolomCariSantri value={cari} onChange={setCari} onCari={() => { setQ(cari.trim()); setPage(1); }} />
      <FilterPills bungkus accessibilityLabel="Status" value={status} onChange={v => { setStatus(v); setPage(1); }}
        options={[{ value: '', label: `Semua${data ? ` (${semua})` : ''}` }, ...STATUS_PELANGGARAN.map(s => ({ value: s as string, label: `${s}${data ? ` (${jumlah[s] ?? 0})` : ''}` }))]} />
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : !data ? <LoadingState label="Memuat pelanggaran…" /> : (
        <>
          <ThemedText type="caption" themeColor="textSecondary">{data.items.length} dari {data.total}</ThemedText>
          {data.items.length === 0 ? <EmptyState icon="users" title="Belum ada catatan yang cocok" message="Ubah status atau pencarian untuk melihat catatan lain." /> : null}
          {data.items.map(item => (
            <EntityRow key={item.id} avatarName={item.santri_nama} title={item.santri_nama}
              subtitle={`${waktuPendek(item.waktu_kejadian)} · ${item.jenis ?? item.kategori} · ${item.poin} poin`}
              accessibilityLabel={`Buka pelanggaran ${item.santri_nama}`}
              onPress={() => router.push({ pathname: '/keamanan/pelanggaran/[id]', params: { id: String(item.id) } })}
              pill={<BarisPilIsi><Lencana label={item.status} nada={nadaPembinaan(item.status)} /><Lencana label={item.tingkat} nada="neutral" /></BarisPilIsi>} />
          ))}
          <Pager page={data.page} total={data.total} perPage={data.per_page} onChange={setPage} />
        </>
      )}
      <CatatanHanyaBaca />
    </Halaman>
  );
}
