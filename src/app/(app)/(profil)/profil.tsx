import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { MODE_LABEL } from '@/components/mode-switcher';
import { ScreenHeader } from '@/components/screen-header';
import { Badge, ChipRow } from '@/components/ui/chip';
import { ListRow, RowGroup } from '@/components/ui/list-row';
import { Divider, Overline, Panel } from '@/components/ui/surface';
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

      <Panel style={styles.identity}>
        <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
          <ThemedText selectable style={[styles.avatarText, { color: theme.onPrimary }]}>
            {inisial(nama)}
          </ThemedText>
        </View>
        <View style={styles.identityText}>
          <ThemedText selectable type="h2">
            {nama}
          </ThemedText>
          <ThemedText selectable type="caption" themeColor="textSecondary">
            @{profile?.username}
            {profile?.guru?.nip ? ` · NIP ${profile.guru.nip}` : ''}
          </ThemedText>
        </View>
      </Panel>

      <Panel>
        <Overline>Peran &amp; cakupan</Overline>
        <ChipRow>
          {roles.length === 0 ? (
            <ThemedText selectable type="caption" themeColor="textSecondary">
              Server belum melaporkan peran untuk akun ini.
            </ThemedText>
          ) : (
            roles.map((role) => <Badge key={role} label={role} tone="primary" />)
          )}
        </ChipRow>
        {cakupan.length > 0 ? (
          <>
            <Divider />
            <View style={styles.scopeRow}>
              <View style={styles.scopeText}>
                <ThemedText selectable type="caption" themeColor="textSecondary">
                  Cakupan perizinan
                </ThemedText>
                <ThemedText selectable type="bodyBold">
                  {cakupan.map((mode) => MODE_LABEL[mode]).join(' · ')}
                </ThemedText>
              </View>
              {cakupan.length > 1 ? (
                <AppButton
                  label="Ganti"
                  variant="secondary"
                  size="sm"
                  style={styles.scopeButton}
                  onPress={() => router.push('/perizinan')}
                />
              ) : null}
            </View>
            <ThemedText selectable type="caption" themeColor="textMuted">
              {cakupan.length > 1
                ? `Cakupan aktif saat ini: ${modeAktif ? MODE_LABEL[modeAktif] : '—'}. Menggantinya dilakukan dari layar Perizinan.`
                : 'Akun ini memiliki satu cakupan perizinan.'}
            </ThemedText>
          </>
        ) : null}
      </Panel>

      <View style={styles.group}>
        <Overline>Akun</Overline>
        <RowGroup>
          <ListRow
            icon="device"
            title="Perangkat & push"
            onPress={() => router.push('/notifikasi/perangkat')}
          />
          <ListRow
            icon="bell"
            title="Riwayat notifikasi"
            onPress={() => router.push('/notifikasi')}
            last
          />
        </RowGroup>
      </View>

      <View style={styles.group}>
        <Overline>Aplikasi</Overline>
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
    paddingBottom: 120,
    gap: 16,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800' },
  identityText: { flex: 1, gap: 3 },
  scopeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scopeText: { flex: 1, gap: 2 },
  scopeButton: { paddingHorizontal: 16 },
  group: { gap: 8 },
});
