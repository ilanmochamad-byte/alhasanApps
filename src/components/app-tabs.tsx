import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { useAuth } from '@/auth/auth-context';
import { Colors } from '@/constants/theme';

/**
 * Navigasi utama berbasis KEMAMPUAN, bukan nama role (PRD V2 Fase 3 §3–§4).
 *
 * Seluruh tab tetap dideklarasikan agar navigator tidak berubah bentuk saat
 * berjalan (Expo Router SDK 57 tidak mendukung menambah/menghapus tab secara
 * dinamis); yang berubah hanya properti `hidden`. Nilainya dihitung dari
 * capability yang dikirim server ketika profil dimuat — sebelum navigator ini
 * dipasang — sehingga tidak ada remount di tengah pemakaian.
 *
 * Menyembunyikan tab BUKAN kontrol akses: setiap endpoint tetap memeriksa
 * cakupan di server.
 */
export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const { profile, capabilities } = useAuth();

  const roles = profile?.roles ?? [];
  const aksesJadwal = roles.includes('guru') || roles.includes('admin');
  const adaPerizinan = capabilities.list.length > 0;

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Label>Beranda</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(izin)" hidden={!adaPerizinan}>
        <NativeTabs.Trigger.Label>Perizinan</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(schedules)" hidden={!aksesJadwal}>
        <NativeTabs.Trigger.Label>Jadwal</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(reports)" hidden={!aksesJadwal}>
        <NativeTabs.Trigger.Label>Laporan</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
