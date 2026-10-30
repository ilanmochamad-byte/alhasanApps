import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { keamanan } from '@/api/keamanan';
import { CatatanHanyaBaca, Halaman } from '@/components/keamanan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { ListRow, RowGroup } from '@/components/ui/list-row';
import { usePrivateResource } from '@/hooks/use-private-resource';

/**
 * Pintu Keamanan (penugasan lintas guru/pengurus Fase 4, PK-T3). Bagian yang
 * tampil berasal dari `/keamanan/akses` yang dihitung ulang server; setiap
 * daftar dan rincian tetap diperiksa server per permintaan.
 */
export default function KeamananIndexScreen() {
  const router = useRouter();
  const fetcher = useCallback(() => keamanan.akses(), []);
  const { data, error, load } = usePrivateResource(fetcher);
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState label="Memeriksa penugasan Keamanan…" />;
  if (!data.pantau) {
    return <Halaman><EmptyState title="Tidak ada penugasan Keamanan" message="Akun ini tidak memegang penugasan Keamanan yang aktif. Hubungi admin pesantren." /></Halaman>;
  }
  return (
    <Halaman>
      <ThemedText type="h3">Pantauan santri</ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">Seluruh santri aktif. Kasus konseling Rahasia tidak ditampilkan.</ThemedText>
      <RowGroup>
        <ListRow icon="calendar" title="Kehadiran pengajian" subtitle="Laporan kehadiran seluruh jadwal" onPress={() => router.push('/keamanan/kehadiran')} />
        <ListRow icon="izin" title="Perizinan santri" subtitle="Pengajuan asal pengurus dan wali, semua tahap" onPress={() => router.push('/keamanan/izin')} />
        <ListRow icon="users" title="Pelanggaran" subtitle="Catatan pelanggaran santri" onPress={() => router.push('/keamanan/pelanggaran')} />
        <ListRow icon="book" title="Konseling" subtitle="Kasus pembinaan Internal" onPress={() => router.push('/keamanan/konseling')} last />
      </RowGroup>
      <CatatanHanyaBaca />
    </Halaman>
  );
}
