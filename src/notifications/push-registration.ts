import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Registrasi push notification untuk Expo SDK 57.
 *
 * Mengikuti dokumentasi versi tepat SDK 57
 * (https://docs.expo.dev/versions/v57.0.0/sdk/notifications/):
 *
 *  - kanal Android WAJIB dibuat SEBELUM meminta izin, agar dialog izin muncul
 *    dan notifikasi memiliki kanal tujuan;
 *  - izin diminta hanya bila statusnya belum ditentukan — aplikasi tidak
 *    menanyakan ulang setiap kali dibuka;
 *  - `getExpoPushTokenAsync` memerlukan `projectId`;
 *  - push jarak jauh TIDAK tersedia di Expo Go sejak SDK 53; diperlukan
 *    development build dan perangkat nyata.
 */

/**
 * Kanal Android untuk pemberitahuan perizinan.
 *
 * Harus sama dengan `channelId` yang dikirim server
 * (`NotificationDispatcher::ANDROID_CHANNEL_ID`) dan `defaultChannel` pada
 * plugin expo-notifications di app.json.
 */
export const ANDROID_CHANNEL_ID = 'perizinan';
const INSTALLATION_ID_KEY = 'alhasan_installation_id';

export type RegistrationOutcome =
  | { status: 'ok'; token: string; platform: 'android' | 'ios' | 'web' }
  | { status: 'ditolak'; alasan: string }
  | { status: 'tidak_didukung'; alasan: string }
  | { status: 'belum_dikonfigurasi'; alasan: string }
  | { status: 'gagal'; alasan: string };

/**
 * Membuat kanal Android. Idempoten: memanggilnya berulang hanya memperbarui
 * kanal yang sama.
 */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Perizinan santri',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1B7A43',
    // Pemberitahuan perizinan tidak memuat data sensitif, tetapi tetap tidak
    // perlu tampil utuh di layar kunci: ringkasan sudah cukup.
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  });
}

/**
 * Status izin saat ini tanpa pernah memunculkan dialog.
 */
export async function permissionStatus(): Promise<Notifications.NotificationPermissionsStatus | null> {
  if (process.env.EXPO_OS === 'web') return null;
  try {
    return await Notifications.getPermissionsAsync();
  } catch {
    return null;
  }
}

function projectId(): string {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const fromEas = (extra?.eas as { projectId?: string } | undefined)?.projectId;
  const fromExtra = typeof extra?.easProjectId === 'string' ? extra.easProjectId : '';
  const fromLegacy = (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  return (fromEas || fromExtra || fromLegacy || '').trim();
}

/**
 * Meminta izin bila perlu, lalu mengambil Expo push token.
 *
 * @param minta bila false, hanya memakai izin yang SUDAH diberikan dan tidak
 *              pernah memunculkan dialog. Dipakai saat aplikasi dibuka kembali
 *              agar pengguna tidak ditanya berulang kali.
 */
export async function registerForPushNotificationsAsync(minta = false): Promise<RegistrationOutcome> {
  if (process.env.EXPO_OS === 'web') {
    return { status: 'tidak_didukung', alasan: 'Push notification tidak tersedia pada versi web.' };
  }

  // Emulator/simulator tidak memiliki layanan push. Ini bukan galat aplikasi;
  // pengujian gerbang Fase 4 memang mewajibkan perangkat nyata.
  if (!Device.isDevice) {
    return {
      status: 'tidak_didukung',
      alasan: 'Push notification memerlukan perangkat nyata. Simulator dan emulator tidak menerima push.',
    };
  }

  try {
    // Kanal dibuat lebih dulu (urutan yang diwajibkan dokumentasi SDK 57).
    await ensureAndroidChannel();

    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted || existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

    if (!granted) {
      // Registrasi otomatis tidak pernah memunculkan dialog. Bahkan ketika
      // pengguna menekan tombol, status `canAskAgain=false` dihormati agar OS
      // tidak diminta ulang setelah penolakan permanen.
      if (!existing.canAskAgain) {
        return {
          status: 'ditolak',
          alasan: 'Izin notifikasi ditolak. Nyalakan kembali melalui Pengaturan perangkat.',
        };
      }
      if (!minta) {
        return {
          status: 'ditolak',
          alasan: 'Push belum dinyalakan. Tekan Nyalakan push untuk meminta izin notifikasi.',
        };
      }
      const diminta = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      granted = diminta.granted || diminta.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
      if (!granted) {
        return { status: 'ditolak', alasan: 'Izin notifikasi belum diberikan pada perangkat ini.' };
      }
    }

    const id = projectId();
    if (!id) {
      return {
        status: 'belum_dikonfigurasi',
        alasan:
          'Project ID Expo belum tersedia. Jalankan `eas init` atau isi EXPO_PUBLIC_EAS_PROJECT_ID pada development build.',
      };
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
    if (!token) {
      return { status: 'gagal', alasan: 'Expo tidak mengembalikan token perangkat.' };
    }

    return {
      status: 'ok',
      token,
      platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
    };
  } catch (caught) {
    // Penyebab paling umum: aplikasi berjalan di Expo Go (push jarak jauh tidak
    // didukung sejak SDK 53) atau credential push belum disiapkan di EAS.
    const pesan = caught instanceof Error ? caught.message : 'Registrasi push gagal.';
    return {
      status: 'gagal',
      alasan: `${pesan} Pastikan aplikasi dijalankan sebagai development build, bukan Expo Go.`,
    };
  }
}

/**
 * Identitas instalasi yang stabil selama aplikasi terpasang.
 *
 * Dipakai server agar token baru pada perangkat yang sama MENGGANTI baris lama
 * alih-alih menumpuk. Bukan pengenal perangkat keras dan tidak dipakai untuk
 * pelacakan.
 */
export async function installationId(): Promise<string> {
  if (process.env.EXPO_OS === 'web') return 'web';
  try {
    const existing = await SecureStore.getItemAsync(INSTALLATION_ID_KEY);
    if (existing) return existing.slice(0, 100);

    // Ini bukan secret atau pengenal perangkat keras. Nilainya hanya perlu
    // acak dan persisten agar rotasi Expo push token memperbarui baris perangkat
    // yang sama, bukan membuat baris baru pada setiap sesi aplikasi.
    const random = Array.from({ length: 4 }, () => Math.random().toString(36).slice(2)).join('');
    const created = `install-${Date.now().toString(36)}-${random}`.slice(0, 100);
    await SecureStore.setItemAsync(INSTALLATION_ID_KEY, created, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
    return created;
  } catch {
    // Fallback tetap stabil selama proses berjalan. Registrasi token yang sama
    // masih dideduplikasi server lewat token_hash.
    return `install-fallback-${Constants.sessionId ?? 'tanpa-id'}`.slice(0, 100);
  }
}

export function deviceLabel(): string {
  const nama = Device.modelName || Device.deviceName || 'Perangkat';
  return String(nama).slice(0, 100);
}

export function appVersion(): string {
  return String(Constants.expoConfig?.version ?? '').slice(0, 30);
}
