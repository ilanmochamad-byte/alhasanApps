import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { rapor } from '@/api/rapor';
import { useAuth } from '@/auth/auth-context';
import { TombolMuatUlangKepala } from '@/components/halaman-stack';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { RaporPage } from '@/components/rapor-shared';
import { ThemedText } from '@/components/themed-text';
import { EntityRow } from '@/components/ui/entity-row';
import { ListRow, RowGroup } from '@/components/ui/list-row';
import { StatusPill } from '@/components/ui/status-pill';
import { usePrivateResource } from '@/hooks/use-private-resource';

const JUDUL = 'Rapor semester';

export default function Hub() { const { profile } = useAuth(); return <Menu key={profile?.id} />; }
function Menu() {
  const router = useRouter();
  const fetcher = useCallback(async () => {
    const caps = await rapor.capabilities();
    return { caps, reports: caps.list.includes('rapor.wali') ? await rapor.list() : [] };
  }, []);
  const { data, error, load } = usePrivateResource(fetcher);
  if (error) return <RaporPage title={JUDUL}><ErrorState message={error} onRetry={() => void load()} /></RaporPage>;
  if (!data) return <RaporPage title={JUDUL}><LoadingState /></RaporPage>;
  const c = data.caps.list;
  const petugas = [
    ...(c.includes('nilai.input') ? [{ icon: 'book' as const, title: 'Nilai mata pelajaran', subtitle: 'Isi, serahkan, dan koreksi nilai', onPress: () => router.push('/rapor/nilai') }] : []),
    ...(c.includes('nilai.input_pengganti') ? [{ icon: 'book' as const, title: 'Nilai pengganti Pendidikan', subtitle: 'Isian pengganti beralasan', onPress: () => router.push({ pathname: '/rapor/nilai', params: { pengganti: '1' } }) }] : []),
    ...(c.includes('sikap.input') ? [{ icon: 'users' as const, title: 'Sikap pembimbing', subtitle: 'Adab, kedisiplinan, tanggung jawab', onPress: () => router.push('/rapor/sikap') }] : []),
    ...(c.includes('sikap.murobi') ? [{ icon: 'users' as const, title: 'Sikap murobi', subtitle: 'Ketahui sikap tanpa mengubah isi', onPress: () => router.push({ pathname: '/rapor/sikap', params: { mode: 'murobi' } }) }] : []),
    ...(c.includes('rapor.verifikasi') ? [{ icon: 'check-circle' as const, title: 'Verifikasi bahan & penerbitan', subtitle: 'Periksa bahan, pratinjau, terbitkan', onPress: () => router.push('/rapor/verifikasi') }] : []),
  ];
  return <RaporPage title={JUDUL} actions={<TombolMuatUlangKepala onPress={() => void load()} />}>
    {petugas.length > 0 && <RowGroup>
      {petugas.map((b, i) => <ListRow key={b.title} icon={b.icon} title={b.title} subtitle={b.subtitle} accessibilityLabel={b.title} onPress={b.onPress} last={i === petugas.length - 1} />)}
    </RowGroup>}
    {c.includes('rapor.wali') && <><ThemedText type="h2" accessibilityRole="header">Rapor keluarga</ThemedText>{data.reports.length === 0 && <EmptyState icon="book" title="Belum ada rapor terbit" message="Rapor akan tersedia setelah diterbitkan Pendidikan." />}
      {data.reports.map(r => <EntityRow key={r.id} icon="book" title={r.nama_santri} subtitle={`${r.tahun} ${r.semester}`}
        accessibilityLabel={`${r.nama_santri} · ${r.tahun} ${r.semester} · ${r.status}`}
        pill={<StatusPill label={r.status} tone={r.status === 'Terbit' ? 'success' : r.status === 'Ditarik' ? 'danger' : 'neutral'} />}
        onPress={() => router.push({ pathname: '/rapor/[id]', params: { id: String(r.id) } })} />)}</>}
    {!c.length && <EmptyState icon="book" title="Belum ada akses rapor" message="Hubungi admin untuk memeriksa penugasan atau relasi wali." />}
  </RaporPage>;
}
