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
 *
 * Redesain V2:
 *  - setiap tab memakai ikonnya sendiri (sebelumnya empat tab berbagi satu
 *    berkas `explore.png`, sehingga tab tidak terbaca sekilas);
 *  - pusat notifikasi keluar dari tab dan menjadi lonceng di bilah judul,
 *    karena ia dibuka sesekali, bukan sebagai tujuan utama;
 *  - tab Profil menampung identitas, cakupan peran, perangkat, dan tombol
 *    Keluar yang dulu terselip di dasar Beranda.
 *
 * Bentuk bilah tab digambar oleh sistem operasi — pada iOS 26 ia tampil
 * sebagai bar Liquid Glass yang mengambang. Yang dikendalikan berkas ini
 * hanyalah ikon, label, warna, dan tab mana yang tampil.
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
      indicatorColor={colors.backgroundSelected}
      labelStyle={{ selected: { color: colors.primary } }}>
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Label>Beranda</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/icons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(schedules)" hidden={!aksesJadwal}>
        <NativeTabs.Trigger.Label>Jadwal</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/icons/calendar.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(izin)" hidden={!adaPerizinan}>
        <NativeTabs.Trigger.Label>Perizinan</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/icons/izin.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(reports)" hidden={!aksesJadwal}>
        <NativeTabs.Trigger.Label>Laporan</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/icons/chart.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(profil)">
        <NativeTabs.Trigger.Label>Profil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/icons/person.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
