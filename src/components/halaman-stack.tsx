import { useEffect, useState, type ReactNode } from 'react';
import { AppState, StyleSheet, View, useWindowDimensions } from 'react-native';

import { AppIcon, type IconName } from '@/components/app-icon';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import type { HeaderMenuItem } from '@/components/screen-header';
import { StackScreen } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { ActionBar } from '@/components/ui/action-bar';
import { AvatarInisial } from '@/components/ui/avatar-inisial';
import { IconButton } from '@/components/ui/icon-button';
import { Elevation, Layout, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Kerangka layar stack modul (redesain gelombang 2 Fase 4, pola P-Rincian,
 * P-Form, P-Daftar, P-Laporan): kepala ← · judul tengah · ⋯ berada DI LUAR
 * area gulir (K-7, K-10) sehingga tombol kembali selalu terjangkau, juga saat
 * layar memuat, gagal, atau ditolak server. Generalisasi `Halaman` Keuangan
 * Fase 3 untuk Kesehatan, Keamanan, Pembinaan, Rapor, dan Publikasi.
 *
 * Hanya tampilan: tidak memanggil API dan tidak memegang data.
 */
export type KepalaHalaman = {
  /** Judul umum layar (tanpa nama santri atau isi privat). */
  title: string;
  subtitle?: string;
  /** Tindakan sekunder di balik ⋯ (lebih dari satu). */
  menu?: HeaderMenuItem[];
  /** Tombol ikon di kepala (mis. Muat ulang). */
  actions?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
};

/** Aplikasi sedang di depan (bukan pengalih aplikasi/layar kunci). */
export function useAplikasiAktif() {
  const [aktif, setAktif] = useState(AppState.currentState === 'active' || AppState.currentState === undefined);
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => setAktif(state === 'active'));
    return () => sub.remove();
  }, []);
  return aktif;
}

export function HalamanStack({
  bawah,
  penutup,
  children,
  ...kepala
}: KepalaHalaman & {
  /** Tombol tetap di bawah (ActionBar); pada teks > 1,35× ikut digulir di akhir isi. */
  bawah?: ReactNode;
  /**
   * Teks penutup saat aplikasi tidak aktif (pengalih aplikasi, layar kunci).
   * Diisi untuk modul berdata privat yang sudah memakai penutup sebelum
   * redesain (Kesehatan, Keamanan); kosong = tanpa penutup.
   */
  penutup?: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  const aktif = useAplikasiAktif();
  // iOS dapat mempertahankan pengukuran teks lama ketika Dynamic Type diubah
  // saat layar aktif; hanya area gulir yang dipasang ulang (isian formulir
  // disimpan di layar induk dan tetap ada). Pola Fase 3.
  const { fontScale } = useWindowDimensions();
  const bilahTetap = Boolean(bawah) && fontScale <= 1.35;
  return (
    <StackScreen {...kepala}>
      <View style={styles.isi}>
        <KeyboardAwareScrollView
          key={`gulir-${fontScale}`}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
          style={{ backgroundColor: theme.background }}
          contentContainerStyle={[styles.page, bilahTetap ? styles.pageBilah : null]}>
          {children}
          {bawah && !bilahTetap ? <View style={styles.tombolGulir}>{bawah}</View> : null}
        </KeyboardAwareScrollView>
        {bilahTetap ? <ActionBar>{bawah}</ActionBar> : null}
        {penutup && !aktif ? (
          <View style={[StyleSheet.absoluteFill, styles.cover, { backgroundColor: theme.background }]} accessibilityElementsHidden>
            <AppIcon name="lock" size={28} themeColor="textSecondary" />
            <ThemedText themeColor="textSecondary">{penutup}</ThemedText>
          </View>
        ) : null}
      </View>
    </StackScreen>
  );
}

/**
 * Keadaan memuat/galat/kosong/ditolak di dalam kerangka yang sama, sehingga
 * tombol ← tetap terjangkau walau server menolak (403/404) atau offline.
 */
export function HalamanStackKeadaan({ children, ...kepala }: KepalaHalaman & { children: ReactNode }) {
  return (
    <StackScreen {...kepala}>
      <View style={styles.keadaan}>{children}</View>
    </StackScreen>
  );
}

/** Tombol ikon "Muat ulang" di kepala layar. */
export function TombolMuatUlangKepala({ onPress, label = 'Muat ulang' }: { onPress: () => void; label?: string }) {
  return <IconButton icon="refresh" accessibilityLabel={label} onPress={onPress} />;
}

/** Kartu putih bersudut besar untuk blok isi (bagian rincian, isian formulir). */
export function KartuIsi({ children, gap = 12, nada }: { children: ReactNode; gap?: number; nada?: 'privat' | 'peringatan' | 'sorot' }) {
  const theme = useTheme();
  const latar = nada === 'peringatan' ? theme.warningSoft : nada === 'sorot' ? theme.primarySoft : theme.card;
  const garis = nada === 'peringatan' ? theme.warningBorder : nada === 'sorot' ? theme.primary : theme.border;
  return <View style={[styles.kartu, { gap, backgroundColor: latar, borderColor: garis, boxShadow: Elevation.card }]}>{children}</View>;
}

/** Judul bagian dengan isi opsional di kanan (jumlah, pil). */
export function JudulBagianIsi({ title, trailing, icon }: { title: string; trailing?: ReactNode; icon?: 'lock' | 'info' | 'clock' }) {
  return (
    <View style={styles.judulBagian}>
      {icon ? <AppIcon name={icon} size={18} themeColor="textSecondary" /> : null}
      <ThemedText selectable type="h2" accessibilityRole="header" style={styles.flex}>{title}</ThemedText>
      {trailing}
    </View>
  );
}

/**
 * Penanda privat: ikon gembok + teks (bukan warna saja). Dipakai pada catatan
 * klinis, kerahasiaan pembinaan, dan isi yang hanya untuk petugas.
 */
export function PenandaPrivat({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.privat, { backgroundColor: theme.backgroundElement }]} accessibilityRole="text" accessibilityLabel={text}>
      <AppIcon name="lock" size={14} themeColor="textSecondary" />
      <ThemedText type="labelSmall" themeColor="textSecondary" style={styles.flexShrink}>{text}</ThemedText>
    </View>
  );
}

/**
 * Kartu kepala rincian: avatar inisial (K-5, tanpa foto santri), judul,
 * keterangan, dan pil status di bawahnya.
 */
export function KepalaRincian({ nama, judul, keterangan, pills, icon }: { nama?: string; judul: string; keterangan?: string; pills?: ReactNode; icon?: IconName }) {
  const theme = useTheme();
  return (
    <View style={[styles.kartu, styles.kepalaRincian, { backgroundColor: theme.card, borderColor: theme.border, boxShadow: Elevation.card }]}>
      <View style={styles.kepalaBaris}>
        {nama ? <AvatarInisial nama={nama} ukuran={52} /> : icon ? (
          <View style={[styles.kepalaIkon, { backgroundColor: theme.primarySoft }]}><AppIcon name={icon} size={24} themeColor="primary" /></View>
        ) : null}
        <View style={styles.flex}>
          <ThemedText selectable type="h2" accessibilityRole="header">{judul}</ThemedText>
          {keterangan ? <ThemedText selectable type="caption" themeColor="textSecondary">{keterangan}</ThemedText> : null}
        </View>
      </View>
      {pills ? <View style={styles.barisPil}>{pills}</View> : null}
    </View>
  );
}

/** Baris pil yang membungkus ke baris berikutnya. */
export function BarisPilIsi({ children }: { children: ReactNode }) {
  return <View style={styles.barisPil}>{children}</View>;
}

/**
 * Garis waktu riwayat (titik + baris). `items` sudah berupa teks dari server;
 * komponen ini hanya menata.
 */
export function GarisWaktu({ items }: { items: { key: string | number; judul: string; waktu?: string; isi?: ReactNode }[] }) {
  const theme = useTheme();
  return (
    <View>
      {items.map((it, i) => (
        <View key={it.key} style={styles.gwBaris}>
          <View style={styles.gwKolom}>
            <View style={[styles.gwTitik, { backgroundColor: i === 0 ? theme.primary : theme.card, borderColor: theme.primary }]} />
            {i < items.length - 1 ? <View style={[styles.gwGaris, { backgroundColor: theme.border }]} /> : null}
          </View>
          <View style={styles.gwIsi}>
            <ThemedText selectable type="bodyBold">{it.judul}</ThemedText>
            {it.waktu ? <ThemedText selectable type="caption" themeColor="textSecondary">{it.waktu}</ThemedText> : null}
            {it.isi}
          </View>
        </View>
      ))}
    </View>
  );
}

/** Pemisah halaman Sebelumnya · n/m · Berikutnya. */
export const gayaHalaman = StyleSheet.create({
  penomoran: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  flex: { flex: 1 },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  isi: { flex: 1 },
  page: { paddingHorizontal: Layout.screen, paddingTop: 8, gap: Layout.cardGap, maxWidth: 760, width: '100%', alignSelf: 'center', paddingBottom: 56 },
  pageBilah: { paddingBottom: 24 },
  keadaan: { flex: 1, justifyContent: 'center' },
  tombolGulir: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 8 },
  cover: { alignItems: 'center', justifyContent: 'center', gap: 10 },
  kartu: { borderWidth: 1, borderRadius: Radius.xxl, borderCurve: 'continuous', padding: 16 },
  judulBagian: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 12 },
  privat: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, maxWidth: '100%' },
  kepalaRincian: { gap: 12 },
  kepalaBaris: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kepalaIkon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  barisPil: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  gwBaris: { flexDirection: 'row', gap: 12 },
  gwKolom: { width: 14, alignItems: 'center' },
  gwTitik: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, marginTop: 4 },
  gwGaris: { width: 2, flex: 1, marginVertical: 2 },
  gwIsi: { flex: 1, gap: 2, paddingBottom: 14 },
});
