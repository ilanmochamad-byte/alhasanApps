import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { useAuth } from '@/auth/auth-context';
import { AppIcon } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { Elevation, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { inisial, labelBinaan, labelStatus } from '@/profil/format';
import { useProfil } from '@/profil/profil-context';

/** Skala teks sistem di atas ini dianggap "sangat besar" untuk tata letak berkolom. */
const TEKS_BESAR = 1.35;

const LABEL_ROLE: Record<string, string> = { admin: 'Admin', guru: 'Guru', pengurus: 'Pengurus', orang_tua: 'Orang Tua' };

/** Foto profil pemilik, atau inisial bila belum ada/gagal dimuat. */
export function ProfilAvatar({ nama, ukuran, inverse = false }: { nama: string; ukuran: number; inverse?: boolean }) {
  const theme = useTheme();
  const { data, fotoUri } = useProfil();
  const teks = data?.foto.inisial || inisial(nama);
  const bentuk = { width: ukuran, height: ukuran, borderRadius: ukuran / 2 };
  if (fotoUri) {
    return (
      <Image
        source={{ uri: fotoUri }}
        // Foto privat: tidak ditulis ke cache disk.
        cachePolicy="none"
        contentFit="cover"
        accessibilityLabel={`Foto profil ${nama}`}
        style={[bentuk, { backgroundColor: theme.card }]}
      />
    );
  }
  return (
    <View
      accessibilityLabel={`Inisial ${teks}`}
      style={[styles.avatar, bentuk, { backgroundColor: inverse ? theme.card : theme.primarySoft }]}>
      {/* Ukuran avatar sudah mengikuti skala teks; inisial tidak diskalakan lagi agar tidak meluber. */}
      <ThemedText selectable={false} maxFontSizeMultiplier={1} style={[styles.avatarText, { color: theme.primary, fontSize: Math.round(ukuran * 0.36) }]}>
        {teks}
      </ThemedText>
    </View>
  );
}

/** Label status: dari server bila tersedia, cadangan role akun untuk server lama. */
export function useStatusProfil(): string[] {
  const { profile } = useAuth();
  const { data } = useProfil();
  if (data) return labelStatus(data.status);
  return (profile?.roles ?? []).map((r) => LABEL_ROLE[r] ?? r);
}

export function StatusChips({ labels, inverse = false }: { labels: string[]; inverse?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.chips}>
      {labels.map((label) => (
        <View
          key={label}
          style={[styles.chip, inverse
            ? { borderColor: theme.heroAccent }
            : { borderColor: theme.primaryBorder, backgroundColor: theme.primarySoft }]}>
          <AppIcon name="person" size={14} color={inverse ? theme.heroText : theme.primary} />
          <ThemedText selectable style={[styles.chipText, { color: inverse ? theme.heroText : theme.primary }]}>
            {label}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

function tanggalHariIni() {
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
}

/**
 * Kartu identitas Beranda (PRD-PROFIL-IMPORT Fase 2): isi pertama layar setelah
 * area aman. Foto/inisial, nama lengkap, seluruh status aktif, dan target
 * kamar/kelas Murobi/Pembimbing — semuanya dari server. Ketuk membuka Profil.
 */
export function KartuIdentitas() {
  const router = useRouter();
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const bertumpuk = fontScale > TEKS_BESAR;
  const { profile } = useAuth();
  const { data, status, error } = useProfil();
  const nama = data?.pribadi.nama ?? profile?.guru?.name ?? profile?.name ?? '';
  const labels = useStatusProfil();
  const binaan = data ? labelBinaan(data.binaan) : [];
  const ukuran = Math.round(58 * Math.min(fontScale, 1.8));

  return (
    <View
      testID="kartu-identitas"
      style={[styles.kartu, { backgroundColor: theme.heroSurface, borderColor: theme.heroBorder, boxShadow: Elevation.brand }]}>
      {/* Redesain gelombang 2 (K-9): lonceng pindah ke kepala Beranda. */}
      <ThemedText selectable type="caption" style={{ color: theme.heroTextSecondary }}>
        {tanggalHariIni()}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${nama}. ${labels.join(', ')}. Buka profil`}
        accessibilityHint="Membuka halaman Profil"
        onPress={() => router.push('/profil')}
        style={({ pressed }) => [styles.isi, bertumpuk && styles.isiBertumpuk, { opacity: pressed ? 0.85 : 1 }]}>
        <ProfilAvatar nama={nama} ukuran={ukuran} inverse />
        <View style={styles.teks}>
          <ThemedText selectable type="caption" style={{ color: theme.heroAccent }}>
            Assalamu&rsquo;alaikum,
          </ThemedText>
          <ThemedText selectable style={[styles.nama, { color: theme.heroText }]}>
            {nama}
          </ThemedText>
          {status === 'memuat' && !data ? (
            <ThemedText selectable type="caption" style={{ color: theme.heroTextSecondary }}>
              Memuat status akun…
            </ThemedText>
          ) : labels.length > 0 ? (
            <StatusChips labels={labels} inverse />
          ) : (
            <ThemedText selectable type="caption" style={{ color: theme.heroTextSecondary }}>
              Belum ada status atau penugasan aktif.
            </ThemedText>
          )}
          {binaan.map((baris) => (
            <ThemedText key={baris} selectable type="caption" style={[styles.binaan, { color: theme.heroText }]}>
              {baris}
            </ThemedText>
          ))}
          {error && !data ? (
            <ThemedText selectable type="caption" style={{ color: theme.heroTextSecondary }}>
              Status terbaru belum dapat dimuat. Tarik ke bawah untuk mencoba lagi.
            </ThemedText>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  kartu: { borderWidth: 1, borderRadius: Radius.hero, borderCurve: 'continuous', padding: 16, gap: 10 },
  isi: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  isiBertumpuk: { flexDirection: 'column' },
  teks: { flexGrow: 1, flexShrink: 1, gap: 4 },
  nama: { fontSize: 20, lineHeight: 26, fontWeight: '800' },
  binaan: { fontWeight: '700' },
  avatar: { alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
  avatarText: { fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%', borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 2 },
  chipText: { flexShrink: 1, fontSize: 12, lineHeight: 16, fontWeight: '800' },
});
