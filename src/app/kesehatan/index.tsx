import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { ApiError } from '@/api/client';
import { kesehatan } from '@/api/kesehatan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { TombolMuatUlangKepala } from '@/components/halaman-stack';
import { Halaman, HalamanKeadaan } from '@/components/kesehatan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { HeroCard } from '@/components/ui/hero-card';
import { ListRow, RowGroup } from '@/components/ui/list-row';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { labelSumber } from '@/kesehatan/forms';

/**
 * Pintu modul kesehatan V5 (redesain gelombang 2 Fase 4, pola P-Menu).
 * Tombol dipilih dari hak yang dihitung server (`/v5/kesehatan/akses`,
 * `/v5/kesehatan/wali/akses`); menyembunyikan tombol bukan kontrol akses —
 * setiap layar memanggil server lagi. Respons akses tidak memuat angka, jadi
 * menu tidak menampilkan kartu statistik (tanpa angka karangan).
 */
export default function KesehatanHub() {
  const { profile } = useAuth();
  return <Hub key={profile?.id} />;
}

const JUDUL = 'Kesehatan';

function Hub() {
  const router = useRouter();
  const fetcher = useCallback(async () => {
    const lunak = async <T,>(p: Promise<T>): Promise<T | null> => {
      try { return await p; } catch (e) { if (e instanceof ApiError && e.status === 503) return null; throw e; }
    };
    const [akses, wali] = await Promise.all([lunak(kesehatan.akses()), lunak(kesehatan.aksesWali())]);
    return { akses, wali };
  }, []);
  const { data, error, load } = usePrivateResource(fetcher);
  if (error) return <HalamanKeadaan title={JUDUL}><ErrorState message={error} onRetry={() => void load()} /></HalamanKeadaan>;
  if (!data) return <HalamanKeadaan title={JUDUL}><LoadingState label="Memeriksa akses kesehatan…" /></HalamanKeadaan>;
  const { akses, wali } = data;
  if (!akses && !wali) {
    return <HalamanKeadaan title={JUDUL}><EmptyState icon="medical" title="Modul kesehatan belum tersedia" message="Server belum memasang modul kesehatan. Hubungi admin pesantren." /></HalamanKeadaan>;
  }
  const internal = Boolean(akses?.baca);
  const daftar = akses?.cakupan === 'binaan' ? 'Riwayat kesehatan santri binaan' : 'Daftar kunjungan';
  return (
    <Halaman title={JUDUL} actions={<TombolMuatUlangKepala onPress={() => void load()} />}>
      {internal && akses ? (
        <>
          <ThemedText type="h2" accessibilityRole="header">Catatan kesehatan santri</ThemedText>
          <ThemedText themeColor="textSecondary">{labelSumber(akses.sumber)}</ThemedText>
          {akses.catat ? <AppButton label="Catat kunjungan" icon="plus" onPress={() => router.push('/kesehatan/catat')} /> : null}
          <RowGroup>
            <ListRow icon="medical" title={daftar} accessibilityLabel={daftar}
              subtitle="Kunjungan klinik, rujukan, dan tindak lanjut"
              onPress={() => router.push('/kesehatan/daftar')} />
            <ListRow icon="chart" title="Laporan layanan klinik" accessibilityLabel="Laporan layanan klinik"
              subtitle="Rekap kunjungan per periode, tanpa isi klinis"
              onPress={() => router.push('/kesehatan/laporan')} last={!akses.riwayat_akses} />
            {akses.riwayat_akses ? (
              <ListRow icon="users" title="Penugasan petugas kesehatan" accessibilityLabel="Penugasan petugas kesehatan"
                subtitle="Tambah, akhiri, atau nonaktifkan petugas"
                onPress={() => router.push('/kesehatan/penugasan')} last />
            ) : null}
          </RowGroup>
          {!akses.catat ? (
            <ThemedText type="caption" themeColor="textSecondary">
              {akses.cakupan === 'binaan'
                ? 'Hanya baca: kunjungan tercatat santri dalam cakupan penugasan aktif Anda.'
                : 'Hanya baca. Isi klinis dicatat dan dikoreksi petugas kesehatan berpenugasan aktif.'}
            </ThemedText>
          ) : null}
        </>
      ) : null}
      {wali?.wali ? (
        <HeroCard overline="Kesehatan anak" title="Ringkasan kunjungan klinik yang diterbitkan pesantren untuk Anda."
          action={{ label: 'Buka informasi kesehatan anak', icon: 'arrow-right', onPress: () => router.push('/kesehatan/wali') }} />
      ) : null}
      {!internal && !wali?.wali ? (
        <EmptyState icon="medical" title="Belum ada akses kesehatan" message="Catatan kesehatan hanya untuk petugas kesehatan berpenugasan aktif, admin, pembimbing/murobi santri terkait, dan orang tua dengan relasi wali aktif." />
      ) : null}
    </Halaman>
  );
}
