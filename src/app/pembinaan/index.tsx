import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { pembinaan } from '@/api/pembinaan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { HalamanStack, HalamanStackKeadaan, TombolMuatUlangKepala } from '@/components/halaman-stack';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { ListRow, RowGroup } from '@/components/ui/list-row';
import { usePrivateResource } from '@/hooks/use-private-resource';

const JUDUL = 'Pembinaan';

/**
 * Menu pembinaan V3 (redesain gelombang 2 Fase 4, pola P-Menu): daftar baris
 * berikon + tombol cepat 2 kolom. Pilihan dari kemampuan yang dihitung
 * server; menyembunyikan tombol bukan kontrol akses.
 */
export default function Hub() {
  const { profile } = useAuth();
  return <Menu key={profile?.id} />;
}
function Menu() {
  const router = useRouter();
  const fetcher = useCallback(() => pembinaan.capabilities(), []);
  const { data, error, load } = usePrivateResource(fetcher);
  if (error) return <HalamanStackKeadaan title={JUDUL}><ErrorState message={error} onRetry={() => void load()} /></HalamanStackKeadaan>;
  if (!data) return <HalamanStackKeadaan title={JUDUL}><LoadingState /></HalamanStackKeadaan>;
  const c = data.capabilities;
  const internal = Boolean(c['v3.pelanggaran.kelola'] || c['v3.binaan.baca'] || c['v3.pengawasan']);
  if (!internal && !c['v3.publikasi.baca']) {
    return <HalamanStackKeadaan title={JUDUL}><EmptyState icon="users" title="Belum ada akses pembinaan" message="Penugasan atau relasi wali aktif diperlukan." /></HalamanStackKeadaan>;
  }
  const baris = [
    ...(internal ? [
      { icon: 'users' as const, title: 'Pelanggaran & poin', subtitle: 'Catatan pelanggaran dan poin santri', onPress: () => router.push({ pathname: '/pembinaan/daftar', params: { jenis: 'pelanggaran' } }) },
      { icon: 'book' as const, title: 'Kasus & sesi konseling', subtitle: 'Pendampingan, sesi, dan penutupan kasus', onPress: () => router.push({ pathname: '/pembinaan/daftar', params: { jenis: 'kasus' } }) },
    ] : []),
    ...(c['v3.konseling.kelola'] || c['v3.pengawasan'] ? [
      { icon: 'arrow-right' as const, title: 'Rekomendasi tindak lanjut', subtitle: 'Rekomendasi dari ambang poin', onPress: () => router.push({ pathname: '/pembinaan/daftar', params: { jenis: 'rekomendasi' } }) },
    ] : []),
    ...(c['v3.publikasi.baca'] ? [
      { icon: 'mail' as const, title: 'Informasi untuk keluarga', subtitle: 'Ringkasan pembinaan yang diterbitkan untuk orang tua', onPress: () => router.push({ pathname: '/pembinaan/daftar', params: { jenis: 'publikasi' } }) },
    ] : []),
  ];
  return (
    <HalamanStack title={JUDUL} subtitle="Pelanggaran, konseling, dan informasi keluarga" actions={<TombolMuatUlangKepala onPress={() => void load()} />}>
      {c['v3.pelanggaran.kelola'] ? (
        <>
          <ThemedText type="h2" accessibilityRole="header">Tindakan cepat</ThemedText>
          <View style={styles.cepat}>
            <AppButton label="Catat pelanggaran" icon="plus" style={styles.sel} onPress={() => router.push({ pathname: '/pembinaan/buat', params: { jenis: 'pelanggaran' } })} />
            <AppButton label="Buka kasus" icon="plus" variant="secondary" style={styles.sel} onPress={() => router.push({ pathname: '/pembinaan/buat', params: { jenis: 'kasus' } })} />
          </View>
        </>
      ) : null}
      <RowGroup>
        {baris.map((b, i) => (
          <ListRow key={b.title} icon={b.icon} title={b.title} subtitle={b.subtitle} accessibilityLabel={b.title} onPress={b.onPress} last={i === baris.length - 1} />
        ))}
      </RowGroup>
    </HalamanStack>
  );
}

const styles = StyleSheet.create({
  cepat: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sel: { flexGrow: 1, flexBasis: 150 },
});
