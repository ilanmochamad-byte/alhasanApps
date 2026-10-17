import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { rapor } from '@/api/rapor';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { RaporPage } from '@/components/rapor-shared';
import { ThemedText } from '@/components/themed-text';
import { usePrivateResource } from '@/hooks/use-private-resource';

export default function Hub() { const { profile } = useAuth(); return <Menu key={profile?.id} />; }
function Menu() {
  const router = useRouter();
  const fetcher = useCallback(async () => {
    const caps = await rapor.capabilities();
    return { caps, reports: caps.list.includes('rapor.wali') ? await rapor.list() : [] };
  }, []);
  const { data, error, load } = usePrivateResource(fetcher);
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState />;
  const c = data.caps.list;
  return <RaporPage>
    {c.includes('nilai.input') && <AppButton label="Nilai mata pelajaran" onPress={() => router.push('/rapor/nilai')} />}
    {c.includes('nilai.input_pengganti') && <AppButton label="Nilai pengganti Pendidikan" onPress={() => router.push({ pathname: '/rapor/nilai', params: { pengganti: '1' } })} />}
    {c.includes('sikap.input') && <AppButton label="Sikap pembimbing" onPress={() => router.push('/rapor/sikap')} />}
    {c.includes('sikap.murobi') && <AppButton label="Sikap murobi" onPress={() => router.push({ pathname: '/rapor/sikap', params: { mode: 'murobi' } })} />}
    {c.includes('rapor.verifikasi') && <AppButton label="Verifikasi bahan & penerbitan" onPress={() => router.push('/rapor/verifikasi')} />}
    {c.includes('rapor.wali') && <><ThemedText type="h3">Rapor keluarga</ThemedText>{data.reports.length === 0 && <EmptyState title="Belum ada rapor terbit" message="Rapor akan tersedia setelah diterbitkan Pendidikan." />}
      {data.reports.map(r => <AppButton key={r.id} variant="secondary" label={`${r.nama_santri} · ${r.tahun} ${r.semester} · ${r.status}`} onPress={() => router.push({ pathname: '/rapor/[id]', params: { id: String(r.id) } })} />)}</>}
    {!c.length && <EmptyState title="Belum ada akses rapor" message="Hubungi admin untuk memeriksa penugasan atau relasi wali." />}
    <AppButton label="Muat ulang" variant="secondary" onPress={() => void load()} />
  </RaporPage>;
}
