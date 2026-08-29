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
 * Label sengaja dipendekkan ("Izin", bukan "Perizinan") dan ukurannya dikunci
 * 11 pt: lima label berdampingan pada layar 390 pt saling berdempetan bila
 * dibiarkan memakai ukuran bawaan. Judul lengkapnya tetap muncul di kepala
 * layar masing-masing.
 *
 * Bentuk bilah tab digambar oleh sistem operasi — pada iOS 26 ia tampil
 * sebagai bar Liquid Glass yang mengambang. Yang dikendalikan berkas ini
 * hanyalah ikon, label, warna, dan tab mana yang tampil.
 *
 * Latar bilah sengaja TIDAK diatur agar material bawaan sistem (Liquid Glass
 * di iOS 26, Material 3 di Android) tetap bekerja dan mengikuti mode gelap.
 *
 * Catatan penting soal ikon: bilah tab memakai ukuran alami berkas gambar.
 * Berkas ikon karena itu wajib tersedia dalam tiga kerapatan — `nama.png`
 * 24 px, `nama@2x.png` 48 px, `nama@3x.png` 72 px. Tanpa akhiran kerapatan,
 * React Native menganggap PNG 96 px sebagai 1x dan ikonnya tampil setinggi
 * 96 pt, memenuhi seluruh bilah.
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
      tintColor={colors.primary}
      iconColor={{ default: colors.textMuted, selected: colors.primary }}
      indicatorColor={colors.backgroundSelected}
      // iOS 26: bilah menyusut saat pengguna menggulir ke bawah, sehingga isi
      // layar mendapat ruang penuh dan bilah tidak terasa sesak.
      minimizeBehavior="onScrollDown"
      // Android: label selalu tampil, tidak hanya pada tab yang aktif.
      labelVisibilityMode="labeled"
      labelStyle={{
        default: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
        selected: { fontSize: 11, fontWeight: '700', color: colors.primary },
      }}>
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
        <NativeTabs.Trigger.Label>Izin</NativeTabs.Trigger.Label>
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
