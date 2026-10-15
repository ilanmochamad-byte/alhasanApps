import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View, useColorScheme, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { MODE_LABEL } from '@/components/mode-switcher';
import { ScreenHeader } from '@/components/screen-header';
import { ListRow, RowGroup } from '@/components/ui/list-row';
import { Overline } from '@/components/ui/surface';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const VERSION = Constants.expoConfig?.version ?? '—';

/** Inisial dari nama, maksimal dua huruf. */
function inisial(nama: string) {
  const bagian = nama.trim().split(/\s+/).filter(Boolean);
  if (bagian.length === 0) return '?';
  return (bagian[0][0] + (bagian[1]?.[0] ?? '')).toUpperCase();
}

/**
 * Tab Profil (redesain V2).
 *
 * Layar ini TIDAK menambah kemampuan baru: isinya adalah hal-hal yang dulu
 * tersebar — tombol Keluar di dasar Beranda, pintasan Perangkat & push di
 * layar Notifikasi, dan daftar peran yang hanya muncul sebagai kalimat di
 * Beranda. Baris tema dan ukuran teks bersifat informasi: keduanya mengikuti
 * setelan sistem, sama seperti sebelumnya.
 */
export default function ProfilScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const { fontScale } = useWindowDimensions();
  // Teks sistem sangat besar: avatar ikut membesar dan ditaruh di atas nama
  // agar inisial tidak meluber dan nama mendapat lebar penuh.
  const bertumpuk = fontScale > 1.35;
  const ukuranAvatar = Math.round(56 * Math.min(fontScale, 2));
  const { profile, capabilities, logout } = useAuth();

  const nama = profile?.guru?.name ?? profile?.name ?? '';
  const roles = profile?.roles ?? [];
  const cakupan = capabilities.list;
  const modeAktif = capabilities.default_mode;

  // Perilaku konfirmasi keluar dipindahkan apa adanya dari layar Beranda V1.
  function confirmLogout() {
    if (process.env.EXPO_OS === 'web') {
      if (globalThis.confirm('Keluar dari aplikasi? Token sesi di server dan perangkat akan dicabut.')) {
        void logout();
      }
      return;
    }
    Alert.alert('Keluar dari aplikasi?', 'Token sesi di server dan perangkat akan dicabut.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: () => void logout() },
    ]);
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="never"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}>
      <ScreenHeader title="Profil" bell={false} />

      {/* Redesain tampilan Fase 3 (Konsep C): kartu identitas hijau memuat
          nama dan peran; cakupan perizinan menjadi baris menu berketerangan. */}
      <View
        style={[
          styles.identity,
          bertumpuk && styles.identityStacked,
          { backgroundColor: theme.heroSurface, borderColor: theme.heroBorder },
        ]}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: theme.card, width: ukuranAvatar, height: ukuranAvatar },
          ]}>
          <ThemedText selectable style={[styles.avatarText, { color: theme.primary }]}>
            {inisial(nama)}
          </ThemedText>
        </View>
        <View style={styles.identityText}>
          <ThemedText selectable type="h2" style={{ color: theme.heroText }}>
            {nama}
          </ThemedText>
          <ThemedText selectable type="caption" style={{ color: theme.heroTextSecondary }}>
            @{profile?.username}
            {profile?.guru?.nip ? ` · NIP ${profile.guru.nip}` : ''}
          </ThemedText>
          <View style={styles.roles}>
            {roles.length === 0 ? (
              <ThemedText selectable type="caption" style={{ color: theme.heroTextSecondary }}>
                Server belum melaporkan peran untuk akun ini.
              </ThemedText>
            ) : (
              roles.map((role) => (
                <View key={role} style={[styles.role, { borderColor: theme.heroAccent }]}>
                  <ThemedText selectable style={[styles.roleText, { color: theme.heroText }]}>
                    {role}
                  </ThemedText>
                </View>
              ))
            )}
          </View>
        </View>
      </View>

      <View style={styles.group}>
        <Overline>Akun &amp; pemberitahuan</Overline>
        <RowGroup>
          {cakupan.length > 0 ? (
            <ListRow
              icon="users"
              title="Cakupan perizinan"
              subtitle={
                cakupan.length > 1
                  ? `${cakupan.map((mode) => MODE_LABEL[mode]).join(' · ')} — bawaan: ${modeAktif ? MODE_LABEL[modeAktif] : '—'}. Ganti dari layar Perizinan.`
                  : `${MODE_LABEL[cakupan[0]]} — satu cakupan perizinan`
              }
              value={cakupan.length > 1 ? 'Ganti' : undefined}
              onPress={cakupan.length > 1 ? () => router.push('/perizinan') : undefined}
            />
          ) : null}
          <ListRow
            icon="device"
            title="Perangkat & push"
            subtitle="Atur pemberitahuan di perangkat ini"
            onPress={() => router.push('/notifikasi/perangkat')}
          />
          <ListRow
            icon="bell"
            title="Riwayat notifikasi"
            subtitle="Semua pemberitahuan yang masuk"
            onPress={() => router.push('/notifikasi')}
            last
          />
        </RowGroup>
      </View>

      <View style={styles.group}>
        <Overline>Tampilan</Overline>
        <RowGroup>
          <ListRow icon="moon" title="Tema tampilan" value={scheme === 'dark' ? 'Gelap' : 'Terang'} />
          <ListRow icon="text-size" title="Ukuran teks" value="Ikuti sistem" />
          <ListRow icon="info" title="Tentang aplikasi" value={`versi ${VERSION}`} last />
        </RowGroup>
        <ThemedText selectable type="caption" themeColor="textMuted">
          Tema dan ukuran teks mengikuti setelan perangkat Anda.
        </ThemedText>
      </View>

      <AppButton label="Keluar dari aplikasi" variant="outline" icon="logout" onPress={confirmLogout} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    // Bilah tab iOS 26 mengambang di atas konten; ruang ekstra memastikan
    // tombol Keluar dapat digulir sepenuhnya ke atas bilah itu.
    paddingBottom: 150,
    gap: 16,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderWidth: 1,
    borderRadius: Radius.hero,
    borderCurve: 'continuous',
  },
  identityStacked: { flexDirection: 'column', alignItems: 'flex-start' },
  avatar: {
    borderRadius: Radius.pill,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800' },
  identityText: { flexGrow: 1, flexShrink: 1, gap: 3 },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 4 },
  role: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 2 },
  roleText: { fontSize: 12, lineHeight: 16, fontWeight: '800' },
  group: { gap: 8 },
});
