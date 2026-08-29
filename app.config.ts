import type { ConfigContext, ExpoConfig } from 'expo/config';

const EAS_PROJECT_ID = 'eb56f1b5-1e7b-470a-9f42-9582326858e0';

export default ({ config }: ConfigContext): ExpoConfig => {
  const easProjectId =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID
    ?? (config.extra?.eas as { projectId?: string } | undefined)?.projectId
    ?? EAS_PROJECT_ID;
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON;

  return {
    ...config,
    name: config.name ?? 'alhasanApps',
    slug: config.slug ?? 'alhasanApps',
    ios: {
      ...config.ios,
      entitlements: {
        ...config.ios?.entitlements,
        // Expo menulis `development` pada konfigurasi sumber. Saat arsip
        // distribusi dibuat, Xcode/provisioning profile menggantinya menjadi
        // `production`. Nilai ini sengaja tidak bergantung pada env JavaScript
        // agar setiap build iOS selalu meminta capability APNs.
        'aps-environment': 'development',
      },
    },
    android: {
      ...config.android,
      // Firebase client configuration is supplied as an EAS file environment
      // variable. Its service-account credential remains only in EAS.
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
    extra: {
      ...config.extra,
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
      eas: {
        ...(config.extra?.eas as Record<string, unknown> | undefined),
        projectId: easProjectId,
      },
      // V2 Fase 4 — jalur cadangan untuk development build lokal.
      easProjectId,
    },
  };
};
