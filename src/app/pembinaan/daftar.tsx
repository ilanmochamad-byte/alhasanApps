import { useCallback, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { pembinaan } from '@/api/pembinaan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { Field } from '@/components/ui/app-field';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { usePrivateResource } from '@/hooks/use-private-resource';
export default function List() {
  const { profile } = useAuth(); const { jenis } = useLocalSearchParams<{ jenis: string }>();
  return <ListSession key={`${profile?.id}:${jenis}`} kind={jenis} />;
}
function ListSession({ kind }: { kind: string }) {
  const [page, setPage] = useState(1); const router = useRouter();
  // Pencarian nama/NIS oleh server dalam cakupan aktif, menjangkau seluruh halaman (kasus/pelanggaran).
  const dapatCari = kind === 'kasus' || kind === 'pelanggaran';
  const [cari, setCari] = useState(''); const [q, setQ] = useState('');
  const terapkan = () => { setQ(cari.trim()); setPage(1); };
  const fetcher = useCallback(async () => {
    if (kind === 'publikasi') { const r = await pembinaan.publications(page); return { rows: r.rows.map(p => ({ id: p.id, text: `${p.status} · ${p.ringkasan}`, student: 0, year: 0 })) }; }
    if (kind === 'rekomendasi') { const r = await pembinaan.recommendations(page); return { rows: r.rows.map(p => ({ id: p.id, text: `${p.nama_santri} · ${p.label_snapshot} · ${p.rekomendasi_snapshot}`, student: p.santri_id, year: p.tahun_ajaran_id })) }; }
    if (kind !== 'kasus' && kind !== 'pelanggaran') throw new Error('Menu tidak tersedia.');
    const r = await pembinaan.page(kind, page, q); return { rows: r.rows.map(p => ({ id: p.id, text: `${p.santri_nama} · ${p.status}`, student: p.santri_id, year: p.tahun_ajaran_id })), total: r.total };
  }, [kind, page, q]);
  const { data, error, load } = usePrivateResource(fetcher);
  const kolomCari = dapatCari ? <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
    <View style={{ flex: 1 }}><Field label="Cari santri" accessibilityLabel="Cari santri menurut nama atau NIS" value={cari} onChangeText={setCari}
      placeholder="Nama atau NIS santri" maxLength={100} autoCorrect={false} returnKeyType="search" onSubmitEditing={terapkan} /></View>
    <AppButton label="Cari" size="sm" variant="secondary" onPress={terapkan} />
  </View> : null;
  if (error) return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 24, gap: 16 }}>{kolomCari}<ErrorState message={error} onRetry={() => void load()} /></ScrollView>;
  // Kolom cari tetap terpasang saat memuat agar ketikan tidak hilang.
  if (!data) return kolomCari ? <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 24, gap: 16 }}>{kolomCari}<LoadingState /></ScrollView> : <LoadingState />;
  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 24, gap: 16 }}>
    {kolomCari}
    {q !== '' && 'total' in data ? <ThemedText type="caption" themeColor="textSecondary">{data.total} hasil untuk pencarian.</ThemedText> : null}
    {data.rows.length === 0 && <ThemedText>{q !== '' ? 'Tidak ada data yang cocok dengan pencarian dalam cakupan aktif Anda.' : 'Belum ada data dalam cakupan aktif Anda.'}</ThemedText>}
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
