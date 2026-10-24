import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { ApiError } from '@/api/client';
import { kesehatan } from '@/api/kesehatan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Halaman } from '@/components/kesehatan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Panel } from '@/components/ui/surface';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { labelSumber } from '@/kesehatan/forms';

/**
 * Pintu modul kesehatan V5. Tombol dipilih dari hak yang dihitung server
 * (`/v5/kesehatan/akses`, `/v5/kesehatan/wali/akses`); menyembunyikan tombol
 * bukan kontrol akses — setiap layar memanggil server lagi.
 */
export default function KesehatanHub() {
  const { profile } = useAuth();
  return <Hub key={profile?.id} />;
}

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
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState label="Memeriksa akses kesehatan…" />;
  const { akses, wali } = data;
  if (!akses && !wali) return <EmptyState title="Modul kesehatan belum tersedia" message="Server belum memasang modul kesehatan. Hubungi admin pesantren." />;
  const internal = Boolean(akses?.baca);
  return (
    <Halaman>
      {internal && akses ? (
        <Panel style={{ gap: 12 }}>
          <ThemedText type="h3">Catatan kesehatan santri</ThemedText>
          <ThemedText themeColor="textSecondary">{labelSumber(akses.sumber)}</ThemedText>
          {akses.catat ? <AppButton label="Catat kunjungan" icon="plus" onPress={() => router.push('/kesehatan/catat')} /> : null}
          <AppButton label={akses.cakupan === 'binaan' ? 'Riwayat kesehatan santri binaan' : 'Daftar kunjungan'} variant={akses.catat ? 'secondary' : 'primary'}
            onPress={() => router.push('/kesehatan/daftar')} />
          {akses.riwayat_akses ? <AppButton label="Penugasan petugas kesehatan" variant="secondary" onPress={() => router.push('/kesehatan/penugasan')} /> : null}
          {!akses.catat ? (
            <ThemedText type="caption" themeColor="textSecondary">
              {akses.cakupan === 'binaan'
                ? 'Hanya baca: kunjungan tercatat santri dalam cakupan penugasan aktif Anda.'
                : 'Hanya baca. Isi klinis dicatat dan dikoreksi petugas kesehatan berpenugasan aktif.'}
            </ThemedText>
          ) : null}
        </Panel>
      ) : null}
      {wali?.wali ? (
        <Panel style={{ gap: 12 }}>
          <ThemedText type="h3">Kesehatan anak</ThemedText>
          <ThemedText themeColor="textSecondary">Ringkasan kunjungan klinik yang diterbitkan pesantren untuk Anda.</ThemedText>
          <AppButton label="Buka informasi kesehatan anak" variant={internal ? 'secondary' : 'primary'} onPress={() => router.push('/kesehatan/wali')} />
        </Panel>
      ) : null}
      {!internal && !wali?.wali ? (
        <EmptyState title="Belum ada akses kesehatan" message="Catatan kesehatan hanya untuk petugas kesehatan berpenugasan aktif, admin, pembimbing/murobi santri terkait, dan orang tua dengan relasi wali aktif." />
      ) : null}
      <AppButton label="Muat ulang" variant="secondary" onPress={() => void load()} />
    </Halaman>
  );
}
