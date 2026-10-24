import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { kesehatan } from '@/api/kesehatan';
import { useAuth } from '@/auth/auth-context';
import { Halaman, StatusBadge, waktuPendek } from '@/components/kesehatan-shared';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { ChipRow } from '@/components/ui/chip';
import { Panel } from '@/components/ui/surface';
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
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState label="Memuat riwayat versi…" />;
  return (
    <Halaman>
      <ThemedText type="h3">{data.kunjungan.santri.nama} · {waktuPendek(data.kunjungan.waktu_kunjungan)}</ThemedText>
      {data.versi.map(v => (
        <Panel key={v.versi} style={{ gap: 8 }}>
          <View style={{ gap: 4 }}>
            <ThemedText type="bodyBold">Versi {v.versi}</ThemedText>
            <ChipRow><StatusBadge status={v.status} /></ChipRow>
            <ThemedText type="caption" themeColor="textSecondary">{v.oleh.nama} · {waktuPendek(v.waktu)}</ThemedText>
          </View>
          <ThemedText>Alasan: {v.alasan ?? (v.versi === 1 ? 'Pencatatan awal' : '—')}</ThemedText>
          {v.perubahan.length === 0 && v.versi > 1 ? <ThemedText themeColor="textSecondary">Tidak ada perubahan isi.</ThemedText> : null}
          {v.perubahan.map((p, i) => <ThemedText key={i}>• {teksPerubahan(p)}</ThemedText>)}
        </Panel>
      ))}
    </Halaman>
  );
}
