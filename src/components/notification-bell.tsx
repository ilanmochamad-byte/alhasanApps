import { useRouter } from 'expo-router';

import { IconButton } from '@/components/ui/icon-button';
import { useNotifications } from '@/notifications/notification-context';

/**
 * Lonceng notifikasi di bilah judul layar utama.
 *
 * V2 memindahkan pusat notifikasi dari tab tersendiri ke sini; isinya, jumlah
 * belum dibaca, dan rutenya tidak berubah.
 */
export function NotificationBell() {
  const router = useRouter();
  const { jumlahBelumDibaca } = useNotifications();
  return (
    <IconButton
      icon="bell"
      badge={jumlahBelumDibaca}
      accessibilityLabel={
        jumlahBelumDibaca > 0
          ? `Notifikasi, ${jumlahBelumDibaca} belum dibaca`
          : 'Notifikasi'
      }
      onPress={() => router.push('/notifikasi')}
    />
  );
}
