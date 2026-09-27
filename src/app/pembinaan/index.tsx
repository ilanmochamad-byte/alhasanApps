import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';
import { pembinaan } from '@/api/pembinaan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { usePrivateResource } from '@/hooks/use-private-resource';

export default function Hub() {
  const { profile } = useAuth();
  return <Menu key={profile?.id} />;
}
function Menu() {
  const router = useRouter();
  const fetcher = useCallback(() => pembinaan.capabilities(), []);
  const { data, error, load } = usePrivateResource(fetcher);
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState />;
  const c = data.capabilities;
  const internal = Boolean(c['v3.pelanggaran.kelola'] || c['v3.binaan.baca'] || c['v3.pengawasan']);
  if (!internal && !c['v3.publikasi.baca']) return <EmptyState title="Belum ada akses pembinaan" message="Penugasan atau relasi wali aktif diperlukan." />;
  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 24, gap: 16 }}>
    {internal && <><AppButton label="Pelanggaran & poin" onPress={() => router.push({ pathname: '/pembinaan/daftar', params: { jenis: 'pelanggaran' } })} /><AppButton label="Kasus & sesi konseling" onPress={() => router.push({ pathname: '/pembinaan/daftar', params: { jenis: 'kasus' } })} /></>}
    {Boolean(c['v3.konseling.kelola'] || c['v3.pengawasan']) && <AppButton label="Rekomendasi tindak lanjut" onPress={() => router.push({ pathname: '/pembinaan/daftar', params: { jenis: 'rekomendasi' } })} />}
    {Boolean(c['v3.publikasi.baca']) && <AppButton label="Informasi untuk keluarga" onPress={() => router.push({ pathname: '/pembinaan/daftar', params: { jenis: 'publikasi' } })} />}
    {Boolean(c['v3.pelanggaran.kelola']) && <><AppButton label="Catat pelanggaran" onPress={() => router.push({ pathname: '/pembinaan/buat', params: { jenis: 'pelanggaran' } })} /><AppButton label="Buka kasus" onPress={() => router.push({ pathname: '/pembinaan/buat', params: { jenis: 'kasus' } })} /></>}
  </ScrollView>;
}
