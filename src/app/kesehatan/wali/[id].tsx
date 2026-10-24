import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import { kesehatan } from '@/api/kesehatan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Halaman, KontenRingkasan } from '@/components/kesehatan-shared';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { useNotifications } from '@/notifications/notification-context';

/**
 * Satu ringkasan untuk wali — tujuan ketukan notifikasi kesehatan. ID dari
 * notifikasi/tautan hanya penunjuk: setiap pembukaan, fokus kembali, dan
 * kembali dari latar meminta server, yang memeriksa ulang relasi wali aktif.
 * Ditolak (403) → isi tidak pernah tampil dan penunjuk dibiarkan agar dapat
 * dibuka setelah masuk dengan akun yang berhak.
 */
export default function WaliDetailScreen() {
  const { profile } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Detail key={`${profile?.id}:${id}`} id={Number(id)} />;
}

function Detail({ id }: { id: number }) {
  const { tujuanDibuka } = useNotifications();
  const fetcher = useCallback(async () => {
    if (!Number.isSafeInteger(id) || id < 1) throw new Error('Penunjuk informasi kesehatan tidak valid.');
    const hasil = await kesehatan.detailWali(id);
    tujuanDibuka('kesehatan_ringkasan', id);
    return hasil;
  }, [id, tujuanDibuka]);
  const { data, error, load } = usePrivateResource(fetcher);
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState label="Memeriksa akses informasi kesehatan…" />;
  return (
    <Halaman>
      <KontenRingkasan p={data} />
      <ThemedText type="caption" themeColor="textSecondary">Untuk pertanyaan, hubungi klinik pesantren.</ThemedText>
      <AppButton label="Muat ulang" variant="secondary" onPress={() => void load()} />
    </Halaman>
  );
}
