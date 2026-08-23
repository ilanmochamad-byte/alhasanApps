import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'alhasanApps',
  slug: config.slug ?? 'alhasanApps',
  extra: {
    ...config.extra,
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
    // V2 Fase 4 — push notification.
    //
    // `expo-notifications` SDK 57 mewajibkan projectId saat meminta Expo push
    // token. Nilainya normalnya berasal dari `extra.eas.projectId` yang ditulis
    // `eas init`; variabel di bawah hanya jalur cadangan agar development build
    // lokal tetap dapat mendaftar tanpa menyunting app.json.
    //
    // Nilai ini BUKAN secret: ia hanya pengenal proyek Expo, aman berada di
    // bundle. Credential push (FCM/APNs) tetap berada di server EAS dan tidak
    // pernah masuk repositori maupun bundle aplikasi.
    easProjectId:
      process.env.EXPO_PUBLIC_EAS_PROJECT_ID
      ?? (config.extra?.eas as { projectId?: string } | undefined)?.projectId
      ?? '',
  },
});
