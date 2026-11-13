import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View, useColorScheme, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { akun } from '@/api/akun';
import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { MODE_LABEL } from '@/components/mode-switcher';
import { ProfilAvatar, StatusChips, useStatusProfil } from '@/components/profil-shared';
import { ScreenHeader } from '@/components/screen-header';
import { ErrorState } from '@/components/screen-state';
import { ListRow, RowGroup } from '@/components/ui/list-row';
import { ProfileHeader } from '@/components/ui/profile-header';
import { Overline } from '@/components/ui/surface';
import { Layout } from '@/constants/theme';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { useTheme } from '@/hooks/use-theme';
import { kelompokPenugasan } from '@/keamanan/format';
import { jarakAtasLayarTab } from '@/lib/tampilan';
import { rincianPenugasan, ringkasMengajar } from '@/profil/format';
import { useProfil } from '@/profil/profil-context';

const VERSION = Constants.expoConfig?.version ?? '—';

/**
 * Tab Profil (redesain V2).
 *
 * Layar ini TIDAK menambah kemampuan baru: isinya adalah hal-hal yang dulu
 * tersebar — tombol Keluar di dasar Beranda, pintasan Perangkat & push di
 * layar Notifikasi, dan daftar peran yang hanya muncul sebagai kalimat di
 * Beranda. Baris tema dan ukuran teks bersifat informasi: keduanya mengikuti
 * setelan sistem, sama seperti sebelumnya.
 *
 * PRD-PROFIL-IMPORT Fase 2: layar ini juga pembaca data diri dan penugasan
 * aktif dari `GET /profile/pribadi`. Penugasan, kamar/kobong, mapel, kelas,
 * dan username hanya-baca; Edit Profil dan Ganti Password dibuka dari sini.
 * Server lama tanpa endpoint itu tetap memakai tampilan Fase 4.
 */
export default function ProfilScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const { fontScale } = useWindowDimensions();
  // Avatar besar di tengah; ikut membesar terbatas pada teks sistem besar.
  const ukuranAvatar = Math.round(96 * Math.min(fontScale, 1.4));
  const { profile, capabilities, logout } = useAuth();
  const { data: pribadi, status: statusPribadi, error: galatPribadi, muat: muatPribadi } = useProfil();
  const labelStatus = useStatusProfil();
  useFocusEffect(useCallback(() => { void muatPribadi(); }, [muatPribadi]));

  const nama = pribadi?.pribadi.nama ?? profile?.guru?.name ?? profile?.name ?? '';
  const tampilanLama = statusPribadi === 'tidak_tersedia';
  const cakupan = capabilities.list;
  const modeAktif = capabilities.default_mode;
  // Server lama tanpa endpoint identitas (404) → bagian identitas tidak tampil.
  const muatIdentitas = useCallback(async () => {
    try { return { identitas: await akun.identitas() }; } catch (e) {
      if (e instanceof ApiError && e.status === 404) return { identitas: null };
      throw e;
    }
  }, []);
  const identitas = usePrivateResource(muatIdentitas).data?.identitas;
  const mengajar = pribadi ? ringkasMengajar(pribadi.mengajar) : [];
  const penugasan = kelompokPenugasan(identitas?.penugasan ?? []);

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

  // Redesain gelombang 2: strip angka hanya bila datanya ada di respons profil.
  const jumlahKelas = new Set(mengajar.flatMap((m) => m.kelas)).size;
  const strip = pribadi && (pribadi.penugasan.length > 0 || mengajar.length > 0)
    ? [
        { value: String(pribadi.penugasan.length), label: 'Penugasan aktif' },
        ...(mengajar.length > 0
          ? [{ value: String(mengajar.length), label: 'Mata pelajaran' }, { value: String(jumlahKelas), label: 'Kelas' }]
          : []),
      ]
    : [];

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="never"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingTop: jarakAtasLayarTab(Platform.OS, insets.top) }]}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => void muatPribadi()} tintColor={theme.primary} />}>
      {/* K-10: layar tab memakai ← ke Beranda di atas judul besar. */}
      <ScreenHeader variant="akar" title="Profil" subtitle="Identitas, penugasan, dan pengaturan akun" />

      <ProfileHeader
        avatar={
          pribadi ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={pribadi.foto.ada ? 'Ubah foto profil' : 'Tambahkan foto profil'}
              accessibilityHint="Membuka Edit profil"
              onPress={() => router.push('/akun/edit-profil')}
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
              <ProfilAvatar nama={nama} ukuran={ukuranAvatar} />
              <View style={[styles.lencana, { backgroundColor: theme.primary, borderColor: theme.card }]}>
                <AppIcon name="camera" size={16} color={theme.onPrimary} />
              </View>
            </Pressable>
          ) : (
            <ProfilAvatar nama={nama} ukuran={ukuranAvatar} />
          )
        }
        name={nama}
        caption={`@${pribadi?.akun.username ?? profile?.username}${!pribadi && profile?.guru?.nip ? ` · NIP ${profile.guru.nip}` : ''}`}
        stats={strip}
        pills={
          labelStatus.length === 0 ? (
            <ThemedText selectable type="caption" themeColor="textSecondary" style={styles.tengah}>
              {statusPribadi === 'memuat' ? 'Memuat status akun…' : 'Belum ada status atau penugasan aktif.'}
            </ThemedText>
          ) : (
            <View style={styles.pil}>
              <StatusChips labels={labelStatus} />
            </View>
          )
        }
      />

      {pribadi ? (
        <AppButton label="Edit profil" icon="person" variant="secondary" onPress={() => router.push('/akun/edit-profil')} />
      ) : statusPribadi === 'gagal' && galatPribadi ? (
        <ErrorState message={galatPribadi} onRetry={() => void muatPribadi()} />
      ) : null}

      {/* §4.2: Data diri › membuka rinciannya sendiri (akun/data-diri). */}
      {pribadi ? (
        <RowGroup>
            <ListRow
              icon="person"
              title="Data diri"
              subtitle="Identitas, tempat dan tanggal lahir, alamat, kontak"
              onPress={() => router.push('/akun/data-diri')}
              last
            />
        </RowGroup>
      ) : null}

      {pribadi ? (
        <View style={styles.group}>
          <Overline>Rincian penugasan aktif</Overline>
          {pribadi.penugasan.length === 0 ? (
            <RowGroup>
              <ListRow icon="info" title="Tidak ada penugasan aktif" subtitle="Penugasan ditetapkan admin melalui menu Penugasan." last />
            </RowGroup>
          ) : (
            <RowGroup>
              {pribadi.penugasan.map((p, i) => (
                <ListRow
                  key={p.jenis}
                  icon={p.identitas === 'guru' ? 'book' : 'users'}
                  title={`${p.label}${p.identitas === 'pengurus' && pribadi.sumber === 'guru' ? ' (sebagai pengurus)' : ''}`}
                  subtitle={rincianPenugasan(p).join('\n')}
                  last={i === pribadi.penugasan.length - 1}
                />
              ))}
            </RowGroup>
          )}
          {mengajar.length > 0 ? (
            <>
              <Overline>Mata pelajaran &amp; kelas</Overline>
              <RowGroup>
                {mengajar.map((m, i) => (
                  <ListRow key={m.mapel} icon="book" title={m.mapel} subtitle={m.kelas.join(', ')} last={i === mengajar.length - 1} />
                ))}
              </RowGroup>
            </>
          ) : null}
          <ThemedText selectable type="caption" themeColor="textMuted">
            Hanya baca. Penugasan, kamar/kobong, mata pelajaran, dan kelas diatur admin.
          </ThemedText>
        </View>
      ) : null}

      {/* Penugasan lintas guru/pengurus Fase 4: satu akun, dua identitas (PK-1).
          Informasi saja — menu dan hak tetap ditentukan server. */}
      {identitas && (identitas.guru || identitas.pengurus || identitas.penugasan.length > 0) ? (
        <View style={styles.group}>
          <Overline>Identitas &amp; penugasan</Overline>
          <RowGroup>
            {identitas.guru ? (
              <ListRow
                icon="book"
                title="Sebagai guru"
                subtitle={`${identitas.guru.nama}${identitas.guru.nip ? ` · NIP ${identitas.guru.nip}` : ''} — ${penugasan.guru.length > 0 ? penugasan.guru.join(' · ') : 'tanpa penugasan guru aktif'}`}
                last={!identitas.pengurus}
              />
            ) : null}
            {identitas.pengurus ? (
              <ListRow
                icon="users"
                title="Sebagai pengurus"
                subtitle={`${identitas.pengurus.nama} · ${identitas.pengurus.milik_guru ? 'dibentuk dari data guru' : identitas.pengurus.jabatan} — ${penugasan.pengurus.length > 0 ? penugasan.pengurus.join(' · ') : 'tanpa penugasan pengurus aktif'}`}
                last
              />
            ) : null}
            {!identitas.guru && !identitas.pengurus ? (
              <ListRow icon="users" title="Penugasan aktif" subtitle={identitas.penugasan.map(p => p.label).join(' · ')} last />
            ) : null}
          </RowGroup>
        </View>
      ) : null}

      {!tampilanLama || cakupan.length > 0 ? (
      <View style={styles.group}>
        <Overline>Akun</Overline>
        <RowGroup>
          {!tampilanLama ? (
            <ListRow
              icon="lock"
              title="Ganti password"
              subtitle="Perlu password saat ini; sesi di perangkat lain akan keluar"
              onPress={() => router.push('/akun/ganti-password')}
              last={cakupan.length === 0}
            />
          ) : null}
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
              last
            />
          ) : null}
        </RowGroup>
      </View>
      ) : null}

      <View style={styles.group}>
        <Overline>Pemberitahuan</Overline>
        <RowGroup>
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
          <ListRow icon="text-size" title="Ukuran teks" value="Ikuti sistem" last />
        </RowGroup>
        <ThemedText selectable type="caption" themeColor="textSecondary">
          Tema dan ukuran teks mengikuti setelan perangkat Anda.
        </ThemedText>
      </View>

      <View style={styles.group}>
        <Overline>Tentang</Overline>
        <RowGroup>
          <ListRow icon="info" title="Tentang aplikasi" value={`versi ${VERSION}`} last />
        </RowGroup>
      </View>

      <AppButton label="Keluar dari aplikasi" variant="outline" icon="logout" onPress={confirmLogout} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Layout.screen,
    // Bilah tab iOS 26 mengambang di atas konten; ruang ekstra memastikan
    // tombol Keluar dapat digulir sepenuhnya ke atas bilah itu.
    paddingBottom: 150,
    gap: Layout.sectionGap,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  lencana: {
    position: 'absolute', right: 0, bottom: 0, width: 34, height: 34, borderRadius: 17, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  pil: { alignItems: 'center' },
  tengah: { textAlign: 'center' },
  group: { gap: 8 },
});
