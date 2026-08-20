import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'alhasan_teacher_api_token';

export const tokenStorage = {
  async get(): Promise<string | null> {
    if (process.env.EXPO_OS === 'web') {
      return globalThis.sessionStorage?.getItem(TOKEN_KEY) ?? null;
    }
    return SecureStore.getItemAsync(TOKEN_KEY);
  },

  async set(token: string): Promise<void> {
    if (process.env.EXPO_OS === 'web') {
      globalThis.sessionStorage?.setItem(TOKEN_KEY, token);
      return;
    }
    await SecureStore.setItemAsync(TOKEN_KEY, token, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  },

  async clear(): Promise<void> {
    if (process.env.EXPO_OS === 'web') {
      globalThis.sessionStorage?.removeItem(TOKEN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};
