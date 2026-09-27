import { useCallback, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView } from 'react-native';
import { pembinaan } from '@/api/pembinaan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { usePrivateResource } from '@/hooks/use-private-resource';
export default function List() {
  const { profile } = useAuth(); const { jenis } = useLocalSearchParams<{ jenis: string }>();
  return <ListSession key={`${profile?.id}:${jenis}`} kind={jenis} />;
}
function ListSession({ kind }: { kind: string }) {
  const [page, setPage] = useState(1); const router = useRouter();
  const fetcher = useCallback(async () => {
    if (kind === 'publikasi') { const r = await pembinaan.publications(page); return { rows: r.rows.map(p => ({ id: p.id, text: `${p.status} · ${p.ringkasan}`, student: 0, year: 0 })) }; }
    if (kind === 'rekomendasi') { const r = await pembinaan.recommendations(page); return { rows: r.rows.map(p => ({ id: p.id, text: `${p.nama_santri} · ${p.label_snapshot} · ${p.rekomendasi_snapshot}`, student: p.santri_id, year: p.tahun_ajaran_id })) }; }
    if (kind !== 'kasus' && kind !== 'pelanggaran') throw new Error('Menu tidak tersedia.');
    const r = await pembinaan.page(kind, page); return { rows: r.rows.map(p => ({ id: p.id, text: `${p.santri_nama} · ${p.status}`, student: p.santri_id, year: p.tahun_ajaran_id })) };
  }, [kind, page]);
  const { data, error, load } = usePrivateResource(fetcher);
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState />;
  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 24, gap: 16 }}>
    {data.rows.length === 0 && <ThemedText>Belum ada data dalam cakupan aktif Anda.</ThemedText>}
    {data.rows.map(p => <AppButton key={p.id} variant="secondary" label={p.text} onPress={() => {
      if (kind === 'publikasi') router.push({ pathname: '/publikasi/[id]', params: { id: String(p.id) } });
      else if (kind === 'rekomendasi') router.push({ pathname: '/pembinaan/buat', params: { jenis: 'kasus', rekomendasi: String(p.id), santri: String(p.student), tahun: String(p.year) } });
      else router.push({ pathname: '/pembinaan/detail', params: { jenis: kind, id: String(p.id) } });
    }} />)}
    <ThemedText>Halaman {page}</ThemedText>
    <AppButton label="Sebelumnya" disabled={page === 1} onPress={() => setPage(page - 1)} />
    <AppButton label="Berikutnya" disabled={data.rows.length < 25} onPress={() => setPage(page + 1)} />
    <AppButton label="Muat ulang" onPress={() => void load()} />
  </ScrollView>;
}
