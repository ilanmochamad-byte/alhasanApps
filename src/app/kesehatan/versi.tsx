import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { kesehatan } from '@/api/kesehatan';
import { useAuth } from '@/auth/auth-context';
import { BarisPilIsi, GarisWaktu, KartuIsi } from '@/components/halaman-stack';
import { Halaman, HalamanKeadaan, StatusBadge, waktuPendek } from '@/components/kesehatan-shared';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { teksPerubahan } from '@/kesehatan/forms';

/** Riwayat versi (petugas dan admin). Server menolak pembaca binaan dan mencatat pembukaan. */
export default function VersiScreen() {
  const { profile } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Riwayat key={`${profile?.id}:${id}`} id={Number(id)} />;
}

function Riwayat({ id }: { id: number }) {
  const fetcher = useCallback(() => kesehatan.versi(id), [id]);
  const { data, error, load } = usePrivateResource(fetcher);
  if (error) return <HalamanKeadaan title="Riwayat versi"><ErrorState message={error} onRetry={() => void load()} /></HalamanKeadaan>;
  if (!data) return <HalamanKeadaan title="Riwayat versi"><LoadingState label="Memuat riwayat versi…" /></HalamanKeadaan>;
  return (
    <Halaman title="Riwayat versi">
      <ThemedText type="h3">{data.kunjungan.santri.nama} · {waktuPendek(data.kunjungan.waktu_kunjungan)}</ThemedText>
      <KartuIsi>
        <GarisWaktu items={data.versi.map(v => ({
          key: v.versi,
          judul: `Versi ${v.versi}`,
          waktu: `${v.oleh.nama} · ${waktuPendek(v.waktu)}`,
          isi: (
            <View style={{ gap: 4, paddingTop: 4 }}>
              <BarisPilIsi><StatusBadge status={v.status} /></BarisPilIsi>
              <ThemedText>Alasan: {v.alasan ?? (v.versi === 1 ? 'Pencatatan awal' : '—')}</ThemedText>
              {v.perubahan.length === 0 && v.versi > 1 ? <ThemedText themeColor="textSecondary">Tidak ada perubahan isi.</ThemedText> : null}
              {v.perubahan.map((p, i) => <ThemedText key={i}>• {teksPerubahan(p)}</ThemedText>)}
            </View>
          ),
        }))} />
      </KartuIsi>
    </Halaman>
  );
}
