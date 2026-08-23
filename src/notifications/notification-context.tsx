import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import {
  createContext,
  type PropsWithChildren,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { api } from '@/api/client';
import { useAuth } from '@/auth/auth-context';
import {
  appVersion,
  deviceLabel,
  installationId,
  registerForPushNotificationsAsync,
  type RegistrationOutcome,
} from '@/notifications/push-registration';
import { pushTokenStorage } from '@/notifications/push-token-storage';

/**
 * Perilaku notifikasi saat aplikasi di FOREGROUND.
 *
 * Dipasang di lingkup modul sesuai dokumentasi expo-notifications SDK 57:
 * handler harus terdaftar sebelum komponen mana pun dirender. SDK 57 memakai
 * `shouldShowBanner`/`shouldShowList` (bukan `shouldShowAlert` yang lama).
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

type PushState =
  | { status: 'memeriksa' }
  | { status: 'aktif'; perangkatId: number }
  | { status: 'nonaktif'; alasan: string }
  | { status: 'gagal'; alasan: string };

type NotificationContextValue = {
  jumlahBelumDibaca: number;
  segarkanJumlah: () => Promise<void>;
  kurangiJumlah: (banyak?: number) => void;
  pushState: PushState;
  /** Meminta izin secara eksplisit (dipicu tombol pengguna). */
  nyalakanPush: () => Promise<void>;
  /** Mencabut registrasi perangkat ini tanpa mengganggu notifikasi in-app. */
  matikanPush: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

/**
 * Penyedia notifikasi V2 Fase 4.
 *
 * Tanggung jawab:
 *  1. menjaga jumlah belum dibaca tetap segar;
 *  2. mendaftarkan/mencabut token push per pengguna dan perangkat;
 *  3. menangani notifikasi ketika aplikasi foreground, background, dan dibuka
 *     dari notifikasi (cold start);
 *  4. membuka detail izin lewat deep link SETELAH autentikasi — id pada payload
 *     tidak pernah dipercaya sebagai bukti hak akses; layar detail tetap
 *     memanggil server, yang menolak dengan 403 bila pengguna tidak berhak.
 */
export function NotificationProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const { profile } = useAuth();

  // Jumlah disimpan BERSAMA pemiliknya. Dengan begitu keluar-masuk akun tidak
  // pernah menampilkan lencana milik akun sebelumnya, dan nilainya dapat
  // diturunkan tanpa memanggil setState di dalam effect.
  const [cacheJumlah, setCacheJumlah] = useState<{ userId: number | null; jumlah: number }>({
    userId: null,
    jumlah: 0,
  });
  const [cachePush, setCachePush] = useState<{ userId: number | null; state: PushState }>({
    userId: null,
    state: { status: 'memeriksa' },
  });

  const userId = profile?.id ?? null;
  const tertunda = useRef<number | null>(null);
  const sudahMendaftar = useRef<number | null>(null);

  const jumlahBelumDibaca = cacheJumlah.userId === userId && userId !== null ? cacheJumlah.jumlah : 0;
  const pushState: PushState =
    cachePush.userId === userId && userId !== null ? cachePush.state : { status: 'memeriksa' };

  const setPushState = useCallback(
    (state: PushState) => setCachePush({ userId: profile?.id ?? null, state }),
    [profile?.id],
  );

  const segarkanJumlah = useCallback(async () => {
    if (userId === null) return;
    try {
      const hasil = await api.notifikasiBelumDibaca();
      setCacheJumlah({ userId, jumlah: hasil.jumlah });
    } catch {
      // Lencana bukan fungsi kritis: kegagalan pembacaan dibiarkan diam.
    }
  }, [userId]);

  const kurangiJumlah = useCallback(
    (banyak = 1) => {
      setCacheJumlah((sebelumnya) =>
        sebelumnya.userId === userId
          ? { userId, jumlah: Math.max(0, sebelumnya.jumlah - banyak) }
          : sebelumnya,
      );
    },
    [userId],
  );

  /** Membuka layar tujuan sebuah notifikasi. */
  const buka = useCallback(
    (data: unknown) => {
      if (typeof data !== 'object' || data === null) return;
      const payload = data as { tipe?: unknown; pengajuan_id?: unknown };
      if (payload.tipe !== 'izin') return;
      const id = Number(payload.pengajuan_id);
      if (!Number.isInteger(id) || id < 1) return;

      if (userId === null) {
        // Belum masuk: simpan tujuan dan buka setelah autentikasi berhasil.
        tertunda.current = id;
        return;
      }
      router.push({ pathname: '/izin/[id]', params: { id: String(id) } });
    },
    [router, userId],
  );

  const daftarkanPerangkat = useCallback(
    async (minta: boolean): Promise<RegistrationOutcome> => {
      const hasil = await registerForPushNotificationsAsync(minta);
      if (hasil.status !== 'ok') {
        setPushState({
          status: hasil.status === 'gagal' ? 'gagal' : 'nonaktif',
          alasan: hasil.alasan,
        });
        return hasil;
      }
      try {
        const terdaftar = await api.perangkatDaftar({
          token: hasil.token,
          platform: hasil.platform,
          device_id: await installationId(),
          device_label: deviceLabel(),
          app_version: appVersion(),
        });
        await pushTokenStorage.set(hasil.token);
        setPushState({ status: 'aktif', perangkatId: terdaftar.perangkat_id });
      } catch (caught) {
        setPushState({
          status: 'gagal',
          alasan: caught instanceof Error ? caught.message : 'Perangkat gagal didaftarkan ke server.',
        });
      }
      return hasil;
    },
    [setPushState],
  );

  const nyalakanPush = useCallback(async () => {
    setPushState({ status: 'memeriksa' });
    await daftarkanPerangkat(true);
  }, [daftarkanPerangkat, setPushState]);

  const matikanPush = useCallback(async () => {
    const token = await pushTokenStorage.get();
    try {
      await api.perangkatCabut(
        token
          ? { token, alasan: 'dinonaktifkan_pengguna' }
          : { semua: true, alasan: 'dinonaktifkan_pengguna' },
      );
    } catch {
      // Diabaikan: keadaan lokal tetap dimatikan, dan server akan menolak
      // pengiriman ketika token benar-benar tidak lagi valid.
    }
    await pushTokenStorage.clear();
    sudahMendaftar.current = null;
    setPushState({
      status: 'nonaktif',
      alasan: 'Push dimatikan untuk perangkat ini. Notifikasi dalam aplikasi tetap berjalan.',
    });
  }, [setPushState]);

  // --- Siklus sesi ---------------------------------------------------------
  //
  // Seluruh pembaruan state di sini terjadi SETELAH await (di dalam closure
  // async), sehingga effect ini hanya menyinkronkan sistem eksternal — server
  // notifikasi dan layanan push — bukan memicu render berantai.
  useEffect(() => {
    if (userId === null) {
      // Nilai yang ditampilkan sudah diturunkan dari pemiliknya, jadi tidak ada
      // state yang perlu direset di sini — cukup lupakan registrasi terakhir.
      sudahMendaftar.current = null;
      return;
    }

    // Registrasi otomatis TIDAK memunculkan dialog izin: ia hanya memakai izin
    // yang sudah diberikan. Permintaan izin baru selalu berasal dari tindakan
    // pengguna melalui `nyalakanPush()`.
    const perluDaftar = sudahMendaftar.current !== userId;
    if (perluDaftar) {
      sudahMendaftar.current = userId;
    }

    let aktif = true;
    void (async () => {
      await segarkanJumlah();
      if (!aktif) return;
      if (perluDaftar) {
        await daftarkanPerangkat(false);
      }
    })();

    // Tujuan yang tertunda dari notifikasi yang dibuka sebelum login.
    const menunggu = tertunda.current;
    if (menunggu !== null) {
      tertunda.current = null;
      router.push({ pathname: '/izin/[id]', params: { id: String(menunggu) } });
    }

    return () => {
      aktif = false;
    };
  }, [userId, segarkanJumlah, daftarkanPerangkat, router]);

  // --- Notifikasi tiba saat aplikasi berjalan (foreground) -----------------
  useEffect(() => {
    const diterima = Notifications.addNotificationReceivedListener(() => {
      void segarkanJumlah();
    });
    return () => diterima.remove();
  }, [segarkanJumlah]);

  // --- Pengguna mengetuk notifikasi (foreground maupun background) ---------
  useEffect(() => {
    const ditanggapi = Notifications.addNotificationResponseReceivedListener((response) => {
      buka(response.notification.request.content.data);
      void segarkanJumlah();
    });
    return () => ditanggapi.remove();
  }, [buka, segarkanJumlah]);

  // --- Aplikasi dibuka DARI notifikasi saat sebelumnya tertutup (cold start).
  // `useLastNotificationResponse` mengembalikan tanggapan terakhir, termasuk
  // yang terjadi sebelum listener di atas terpasang.
  const tanggapanTerakhir = Notifications.useLastNotificationResponse();
  const tanggapanDiproses = useRef<string | null>(null);
  useEffect(() => {
    if (!tanggapanTerakhir) return;
    const identitas = tanggapanTerakhir.notification.request.identifier;
    if (tanggapanDiproses.current === identitas) return;
    tanggapanDiproses.current = identitas;
    buka(tanggapanTerakhir.notification.request.content.data);
  }, [tanggapanTerakhir, buka]);

  return (
    <NotificationContext.Provider
      value={{ jumlahBelumDibaca, segarkanJumlah, kurangiJumlah, pushState, nyalakanPush, matikanPush }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = use(NotificationContext);
  if (!context) throw new Error('useNotifications harus digunakan di dalam NotificationProvider.');
  return context;
}
