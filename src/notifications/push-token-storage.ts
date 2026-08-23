import * as SecureStore from 'expo-secure-store';

const PUSH_TOKEN_KEY = 'alhasan_push_token';

/**
 * Penyimpanan Expo push token milik perangkat ini.
 *
 * Token disimpan agar logout dapat mencabut REGISTRASI PERANGKAT INI SAJA,
 * bukan seluruh perangkat akun. Sama seperti token API, ia disimpan di
 * SecureStore (Keychain/Keystore) dan tidak pernah ditulis ke log, dikirim ke
 * pihak ketiga, atau ditampilkan di layar.
 */
export const pushTokenStorage = {
  async get(): Promise<string | null> {
    if (process.env.EXPO_OS === 'web') return null;
    try {
      return await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async set(token: string): Promise<void> {
    if (process.env.EXPO_OS === 'web') return;
    try {
      await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    } catch {
      // Kegagalan menyimpan token tidak boleh menggagalkan sesi: pencabutan
      // saat logout lalu jatuh ke mode "cabut seluruh perangkat akun ini".
    }
  },

  async clear(): Promise<void> {
    if (process.env.EXPO_OS === 'web') return;
    try {
      await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
    } catch {
      // Diabaikan dengan sengaja: logout tetap harus berhasil.
    }
  },
};
