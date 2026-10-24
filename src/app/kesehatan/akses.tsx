import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { kesehatan } from '@/api/kesehatan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Halaman, waktuPendek } from '@/components/kesehatan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/surface';
import { usePrivateResource } from '@/hooks/use-private-resource';

const AKSI: Record<string, string> = { baca_detail: 'Membuka rincian', baca_versi: 'Membuka riwayat versi', baca_ringkasan: 'Membuka ringkasan wali' };

/** Riwayat akses rincian satu kunjungan — hanya admin (server menolak akun lain). */
export default function AksesScreen() {
  const { profile } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Riwayat key={`${profile?.id}:${id}`} id={Number(id)} />;
}

function Riwayat({ id }: { id: number }) {
  const [page, setPage] = useState(1);
  const fetcher = useCallback(() => kesehatan.riwayatAkses(id, page), [id, page]);
  const { data, error, load } = usePrivateResource(fetcher);
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState label="Memuat riwayat akses…" />;
  const total = Math.max(1, Math.ceil(data.total / data.per_page));
  return (
    <Halaman>
      <ThemedText type="h3">Riwayat akses rincian kunjungan ({data.total} pembukaan)</ThemedText>
      {data.rows.length === 0 ? <EmptyState title="Belum ada pembukaan tercatat" message="Pembukaan rincian akan tercatat di sini." /> : null}
      {data.rows.map(r => (
        <Card key={r.id}>
          <View style={{ gap: 3 }}>
            <ThemedText type="bodyBold">{r.pengguna.nama} ({r.pengguna.username})</ThemedText>
            <ThemedText>{AKSI[r.aksi] ?? r.aksi} · sebagai {r.sumber} · kanal {r.kanal}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">{waktuPendek(r.waktu)}</ThemedText>
          </View>
        </Card>
      ))}
      {total > 1 ? (
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <AppButton label="Sebelumnya" size="sm" variant="secondary" disabled={page <= 1} onPress={() => setPage(page - 1)} style={{ flex: 1 }} />
          <ThemedText>{page}/{total}</ThemedText>
          <AppButton label="Berikutnya" size="sm" variant="secondary" disabled={page >= total} onPress={() => setPage(page + 1)} style={{ flex: 1 }} />
        </View>
      ) : null}
    </Halaman>
  );
}
