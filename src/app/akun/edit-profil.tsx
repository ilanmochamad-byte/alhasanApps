import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Alert, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError, actionableError } from '@/api/client';
import { profil as profilApi } from '@/api/profil';
import type { ProfilIsian, ProfilPribadi } from '@/api/types';
import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import { ProfilAvatar } from '@/components/profil-shared';
import { ScreenHeader } from '@/components/screen-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { ActionBar } from '@/components/ui/action-bar';
import { Field } from '@/components/ui/app-field';
import { DateField } from '@/components/ui/date-field';
import { InfoRow } from '@/components/ui/info-row';
import { RowGroup } from '@/components/ui/list-row';
import { Overline, Panel } from '@/components/ui/surface';
import { Layout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  BATAS_FOTO, LABEL_ISIAN, drafDari, galatServer, hariIni, mimeFoto, perubahanProfil, periksaDraf, periksaFoto, type DrafProfil,
} from '@/profil/format';
import { useProfil } from '@/profil/profil-context';

type Formulir = { versi: number; asal: DrafProfil; draf: DrafProfil };

const formulirDari = (data: ProfilPribadi): Formulir => ({ versi: data.versi, asal: drafDari(data), draf: drafDari(data) });

/**
 * Salinan lokal hasil pemilih/pemotong dibuang setelah dikirim; foto hanya
 * disimpan server. Selain berkas yang dikembalikan, pemotong menyimpan salinan
 * antara di cache `ImagePicker` milik aplikasi ini, jadi folder itu disapu.
 */
function buangSalinanLokal(uri?: string) {
  if (process.env.EXPO_OS === 'web') return;
  try { if (uri?.startsWith('file://')) { const berkas = new File(uri); if (berkas.exists) berkas.delete(); } } catch { /* lanjut menyapu */ }
  try {
    const folder = new Directory(Paths.cache, 'ImagePicker');
    if (folder.exists) for (const isi of folder.list()) isi.delete();
  } catch { /* cache dibersihkan sistem */ }
}

function sama(a: DrafProfil, b: DrafProfil) {
  return Object.keys(perubahanProfil(a, b)).length === 0;
}

/**
 * Edit Profil (PRD-PROFIL-IMPORT Fase 2 §4). Hanya isian pribadi yang
 * disetujui; username, NIP/NIK, peran, tugas, kamar, mapel, dan kelas tampil
 * hanya-baca dan tidak pernah dikirim. Hanya kunci yang berubah dikirim
 * bersama `versi`, sehingga perubahan dari tempat lain menghasilkan 409,
 * bukan penimpaan diam-diam. Foto dipilih lewat pemilih media bawaan sistem
 * tanpa izin galeri menyeluruh.
 */
export default function EditProfilScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { data, status, error, muat, terapkan, fotoGagal } = useProfil();
  // Draf baru dibuat saat pengguna mulai mengubah; sebelum itu formulir
  // mengikuti data server terbaru.
  const [formLokal, setForm] = useState<Formulir | null>(null);
  const form = formLokal ?? (data ? formulirDari(data) : null);
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [pesan, setPesan] = useState<{ teks: string; nada: 'danger' | 'primary' } | null>(null);
  // Pesan foto tampil di panel foto, bukan di dasar formulir yang mungkin tak terlihat.
  const [pesanFoto, setPesanFoto] = useState<{ teks: string; nada: 'danger' | 'primary' } | null>(null);
  const [konflik, setKonflik] = useState(false);
  const [sibuk, setSibuk] = useState<'simpan' | 'foto' | null>(null);
  const berjalan = useRef(false);

  useEffect(() => { if (!data) void muat(); }, [data, muat]);

  if (!form || !data) {
    if (status === 'tidak_tersedia') {
      return <View style={[styles.state, { backgroundColor: theme.background, paddingTop: insets.top + 8 }]}>
        <ScreenHeader variant="stack" title="Edit profil" />
        <EmptyState title="Profil belum tersedia" message="Server belum mendukung pengubahan profil dari aplikasi. Hubungi admin pesantren." />
      </View>;
    }
    return <View style={[styles.state, { backgroundColor: theme.background, paddingTop: insets.top + 8 }]}>
      <ScreenHeader variant="stack" title="Edit profil" />
      {error ? <ErrorState message={error} onRetry={() => void muat()} /> : <LoadingState label="Memuat profil…" />}
    </View>;
  }

  const ubah = (isian: ProfilIsian, nilai: string) => {
    setForm((f) => {
      const dasar = f ?? formulirDari(data);
      return { ...dasar, draf: { ...dasar.draf, [isian]: nilai } };
    });
    setGalat((g) => { if (!g[isian]) return g; const { [isian]: _hapus, ...sisa } = g; return sisa; });
  };
  const berubah = !sama(form.asal, form.draf);

  async function simpan() {
    if (!form || berjalan.current) return;
    const lokal = periksaDraf(form.draf);
    setGalat(lokal as Record<string, string>);
    setPesan(null);
    if (Object.keys(lokal).length > 0) { setPesan({ teks: 'Periksa kembali isian yang ditandai.', nada: 'danger' }); return; }
    const kiriman = perubahanProfil(form.asal, form.draf);
    if (Object.keys(kiriman).length === 0) { setPesan({ teks: 'Tidak ada perubahan untuk disimpan.', nada: 'primary' }); return; }
    berjalan.current = true; setSibuk('simpan');
    try {
      const hasil = await profilApi.ubah(kiriman, form.versi);
      terapkan(hasil);
      setForm(null);
      setKonflik(false);
      router.back();
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) setGalat(galatServer(e.details));
      if (e instanceof ApiError && e.status === 409) {
        if (e.details && 'email' in e.details) setGalat(galatServer(e.details));
        else setKonflik(true);
      }
      setPesan({ teks: actionableError(e), nada: 'danger' });
    } finally { berjalan.current = false; setSibuk(null); }
  }

  /** Foto mengubah `versi`; draf teks yang belum disimpan tetap dipertahankan. */
  function terapkanFoto(hasil: ProfilPribadi) {
    terapkan(hasil);
    setForm((f) => (f && sama(f.asal, drafDari(hasil)) ? { ...f, versi: hasil.versi } : f));
  }

  async function pilihFoto() {
    if (berjalan.current) return;
    setPesanFoto(null);
    berjalan.current = true;
    setSibuk('foto');
    let uri: string | undefined;
    try {
      // Pemilih bawaan sistem tanpa izin akses seluruh galeri.
      const pilihan = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8, exif: false, base64: false,
      });
      const aset = pilihan.canceled ? undefined : pilihan.assets[0];
      if (!aset) return;
      uri = aset.uri;
      const mime = mimeFoto(aset.mimeType, aset.fileName, aset.uri);
      const masalah = periksaFoto(mime, aset.fileSize ?? aset.file?.size);
      if (masalah || !mime) {
        setPesanFoto({ teks: masalah ?? 'Foto tidak valid.', nada: 'danger' });
        return;
      }
      const ekstensi = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
      const hasil = await profilApi.unggahFoto({ uri, nama: aset.fileName || `foto-profil.${ekstensi}`, mime, file: aset.file });
      terapkanFoto(hasil);
      setPesanFoto({ teks: 'Foto profil diperbarui.', nada: 'primary' });
    } catch (e) {
      setPesanFoto({ teks: actionableError(e), nada: 'danger' });
    } finally {
      buangSalinanLokal(uri);
      berjalan.current = false;
      setSibuk(null);
    }
  }

  async function hapusFoto() {
    if (berjalan.current) return;
    berjalan.current = true; setSibuk('foto'); setPesanFoto(null);
    try {
      terapkanFoto(await profilApi.hapusFoto());
      setPesanFoto({ teks: 'Foto profil dihapus. Inisial nama ditampilkan.', nada: 'primary' });
    } catch (e) {
      setPesanFoto({ teks: actionableError(e), nada: 'danger' });
    } finally { berjalan.current = false; setSibuk(null); }
  }

  function konfirmasiHapusFoto() {
    if (process.env.EXPO_OS === 'web') { if (globalThis.confirm('Hapus foto profil?')) void hapusFoto(); return; }
    Alert.alert('Hapus foto profil?', 'Inisial nama akan ditampilkan sebagai gantinya.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => void hapusFoto() },
    ]);
  }

  function muatTerbaru() {
    setKonflik(false); setGalat({}); setPesan(null);
    setForm(null);
    void muat();
  }

  const kolom = (isian: ProfilIsian, extra: Partial<ComponentProps<typeof Field>> = {}) => (
    <View key={isian} style={styles.kolom}>
      <Field
        label={LABEL_ISIAN[isian]}
        hint={isian === 'nama' ? 'Wajib' : undefined}
        value={form.draf[isian]}
        onChangeText={(v) => ubah(isian, v)}
        accessibilityLabel={LABEL_ISIAN[isian]}
        {...extra}
      />
      {galat[isian] ? <ThemedText selectable type="caption" themeColor="danger">{galat[isian]}</ThemedText> : null}
    </View>
  );
  const ukuranAvatar = Math.round(96 * Math.min(fontScale, 1.4));

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Kepala di luar area gulir agar ← selalu terjangkau (K-10). */}
      <View style={[styles.kepala, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader variant="stack" title="Edit profil" />
      </View>
      <KeyboardAwareScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.content}>

        {/* Redesain gelombang 2: avatar besar berlencana kamera. Tombol Ganti/
            Hapus foto tetap langsung (pemilih foto sistem), bukan lembar bawah. */}
        <View style={styles.foto}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={data.foto.ada ? 'Ubah foto profil' : 'Tambahkan foto profil'}
            disabled={sibuk !== null}
            onPress={() => void pilihFoto()}
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
            <ProfilAvatar nama={form.draf.nama || data.pribadi.nama || ''} ukuran={ukuranAvatar} />
            <View style={[styles.lencana, { backgroundColor: theme.primary, borderColor: theme.background }]}>
              <AppIcon name="camera" size={16} color={theme.onPrimary} />
            </View>
          </Pressable>
          <ThemedText selectable type="caption" themeColor="textSecondary" style={styles.tengah}>
            JPEG, PNG, atau WebP, paling besar {Math.round(BATAS_FOTO / 1024 / 1024)} MB. Dipilih dari pemilih foto perangkat.
          </ThemedText>
          {fotoGagal ? <ThemedText selectable type="caption" themeColor="warning" style={styles.tengah}>Foto tidak dapat dimuat; inisial ditampilkan.</ThemedText> : null}
          {pesanFoto ? (
            <ThemedText selectable type="caption" themeColor={pesanFoto.nada} accessibilityLiveRegion="polite" style={styles.tengah}>{pesanFoto.teks}</ThemedText>
          ) : null}
          <View style={[styles.fotoAksi, fontScale > 1.35 && styles.fotoAksiBertumpuk]}>
            <AppButton label={data.foto.ada ? 'Ganti foto' : 'Pilih foto'} icon="camera" size="sm" variant="secondary"
              loading={sibuk === 'foto'} disabled={sibuk !== null} onPress={() => void pilihFoto()} />
            {data.foto.ada ? (
              <AppButton label="Hapus foto" size="sm" variant="outline" disabled={sibuk !== null} onPress={konfirmasiHapusFoto} />
            ) : null}
          </View>
        </View>

        <Panel>
          <Overline>Data diri</Overline>
          {kolom('nama', { icon: 'person', autoCapitalize: 'words', autoComplete: 'name' })}
          {kolom('tempat_lahir', { icon: 'pin', autoCapitalize: 'words' })}
          <View style={styles.kolom}>
            <DateField label={LABEL_ISIAN.tanggal_lahir} value={form.draf.tanggal_lahir} maximumDate={hariIni()} minimumDate="1900-01-01"
              onChange={(v) => ubah('tanggal_lahir', v)} />
            {form.draf.tanggal_lahir ? (
              <AppButton label="Kosongkan tanggal lahir" size="sm" variant="secondary" onPress={() => ubah('tanggal_lahir', '')} />
            ) : null}
            {galat.tanggal_lahir ? <ThemedText selectable type="caption" themeColor="danger">{galat.tanggal_lahir}</ThemedText> : null}
          </View>
        </Panel>

        <Panel>
          <Overline>Kontak</Overline>
          {kolom('no_hp', { icon: 'phone', keyboardType: 'phone-pad', autoComplete: 'tel', placeholder: '08…' })}
          {kolom('email', { icon: 'mail', keyboardType: 'email-address', autoCapitalize: 'none', autoCorrect: false, autoComplete: 'email' })}
        </Panel>

        <Panel>
          <Overline>Alamat rumah</Overline>
          {kolom('alamat_rumah', { icon: 'home', multiline: true, autoComplete: 'street-address' })}
          {kolom('kelurahan', { autoCapitalize: 'words' })}
          {kolom('kecamatan', { autoCapitalize: 'words' })}
          {kolom('kabupaten', { autoCapitalize: 'words' })}
          {kolom('provinsi', { autoCapitalize: 'words' })}
        </Panel>

        <View style={styles.kolom}>
          <Overline>Diatur admin (hanya baca)</Overline>
          <RowGroup>
            <InfoRow icon="person" label="Username" value={`@${data.akun.username}`} locked last={!data.pribadi.nip && !data.pribadi.nik} />
            {data.pribadi.nip ? <InfoRow icon="info" label="NIP / nomor identitas" value={data.pribadi.nip} locked last={!data.pribadi.nik} /> : null}
            {data.pribadi.nik ? <InfoRow icon="info" label="NIK" value={data.pribadi.nik} locked last /> : null}
          </RowGroup>
          <ThemedText selectable type="caption" themeColor="textSecondary">
            Peran, tugas, kamar/kobong, mata pelajaran, dan kelas ditetapkan admin melalui menu Penugasan.
          </ThemedText>
        </View>

        {pesan ? (
          <ThemedText selectable type="caption" themeColor={pesan.nada} accessibilityLiveRegion="assertive">{pesan.teks}</ThemedText>
        ) : null}
        {konflik ? <AppButton label="Muat data terbaru (draf dibuang)" variant="secondary" icon="refresh" onPress={muatTerbaru} /> : null}
      </KeyboardAwareScrollView>
      <ActionBar>
        <AppButton label="Simpan perubahan" icon="check" loading={sibuk === 'simpan'} disabled={sibuk !== null || !berubah}
          onPress={() => void simpan()} style={styles.simpan} />
      </ActionBar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  kepala: { paddingHorizontal: Layout.screen, paddingBottom: 4, width: '100%', maxWidth: 760, alignSelf: 'center' },
  content: { paddingHorizontal: Layout.screen, paddingTop: 8, gap: 16, paddingBottom: 32, width: '100%', maxWidth: 760, alignSelf: 'center' },
  state: { flex: 1, paddingHorizontal: Layout.screen },
  kolom: { gap: 6 },
  foto: { alignItems: 'center', gap: 10 },
  lencana: {
    position: 'absolute', right: 0, bottom: 0, width: 34, height: 34, borderRadius: 17, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  tengah: { textAlign: 'center' },
  fotoAksi: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  fotoAksiBertumpuk: { flexDirection: 'column', alignSelf: 'stretch' },
  simpan: { flex: 1 },
});
