import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { keamanan } from '@/api/keamanan';
import { Pager } from '@/components/izin-wali-shared';
import { tanggalPanjang } from '@/components/kesehatan-shared';
import { BarisPilIsi, TombolMuatUlangKepala } from '@/components/halaman-stack';
import { CatatanHanyaBaca, Halaman, KolomCariSantri, Lencana, PilKerahasiaan } from '@/components/keamanan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { EntityRow } from '@/components/ui/entity-row';
import { FilterPills } from '@/components/ui/filter-pills';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { labelStatusKasus, nadaPembinaan, STATUS_KASUS } from '@/keamanan/format';

/**
 * Kasus konseling Internal seluruh santri aktif, hanya baca. Kasus Rahasia
 * tidak dikirim server di daftar, angka chip, maupun pencarian (PK-6).
 */
export default function KeamananKonselingScreen() {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [cari, setCari] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const fetcher = useCallback(() => keamanan.konseling({ status, q, page }), [status, q, page]);
  const { data, error, load } = usePrivateResource(fetcher);
  const jumlah = data?.jumlah_status ?? {};
  const semua = Object.values(jumlah).reduce((a, b) => a + b, 0);
  return (
    <Halaman title="Konseling" subtitle="Hanya melihat" actions={<TombolMuatUlangKepala onPress={() => void load()} />}>
      <KolomCariSantri value={cari} onChange={setCari} onCari={() => { setQ(cari.trim()); setPage(1); }} />
      <FilterPills bungkus accessibilityLabel="Status" value={status} onChange={v => { setStatus(v); setPage(1); }}
        options={[{ value: '', label: `Semua${data ? ` (${semua})` : ''}` }, ...STATUS_KASUS.map(s => ({ value: s as string, label: `${labelStatusKasus(s)}${data ? ` (${jumlah[s] ?? 0})` : ''}` }))]} />
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : !data ? <LoadingState label="Memuat kasus konseling…" /> : (
        <>
          <ThemedText type="caption" themeColor="textSecondary">{data.items.length} dari {data.total}</ThemedText>
          {data.items.length === 0 ? <EmptyState icon="users" title="Belum ada kasus" message="Belum ada kasus konseling Internal yang cocok dengan saringan ini." /> : null}
          {data.items.map(item => (
            <EntityRow key={item.id} avatarName={item.santri_nama} title={item.santri_nama}
              subtitle={`Dibuka ${tanggalPanjang(item.dibuka_pada)} · ${item.jumlah_sesi} sesi · ${item.semester} ${item.tahun}`}
              accessibilityLabel={`Buka kasus konseling ${item.santri_nama}`}
              accessibilityHint={`Kerahasiaan ${item.kerahasiaan}`}
              onPress={() => router.push({ pathname: '/keamanan/konseling/[id]', params: { id: String(item.id) } })}
              pill={<BarisPilIsi><Lencana label={labelStatusKasus(item.status)} nada={nadaPembinaan(item.status)} /><PilKerahasiaan label={item.kerahasiaan} /></BarisPilIsi>} />
          ))}
          <Pager page={data.page} total={data.total} perPage={data.per_page} onChange={setPage} />
        </>
      )}
      <CatatanHanyaBaca text="Hanya baca. Kasus Rahasia tidak pernah ditampilkan kepada Keamanan. Cetak/PDF tersedia di website." />
    </Halaman>
  );
}
