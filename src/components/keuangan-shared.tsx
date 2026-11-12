import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AppState, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ApiError } from '@/api/client';
import { keuangan } from '@/api/keuangan';
import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import type { HeaderMenuItem } from '@/components/screen-header';
import { StackScreen } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { ActionBar } from '@/components/ui/action-bar';
import { AvatarInisial } from '@/components/ui/avatar-inisial';
import { IconButton } from '@/components/ui/icon-button';
import { Notice } from '@/components/ui/notice';
import { StatusPill } from '@/components/ui/status-pill';
import { Elevation, Layout, Radius } from '@/constants/theme';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { useTheme } from '@/hooks/use-theme';
import { nadaStatusKeuangan } from '@/keuangan/forms';
import type { StatusPembinaan } from '@/lib/home-menu';

// Komponen bersama layar keuangan V6. Nominal, referensi transfer, dan
// riwayat tidak pernah dicetak ke konsol/log dan tidak disimpan ke disk.

/** Akses keuangan untuk ubin Beranda. Modul belum dipasang (503) = tidak tersedia, bukan galat. */
export function useKeuanganAkses() {
  const fetcher = useCallback(async () => {
    try { return { akses: await keuangan.akses() }; } catch (e) { if (e instanceof ApiError && [404, 503].includes(e.status)) return { akses: null }; throw e; }
  }, []);
  const { data, error, load } = usePrivateResource(fetcher);
  const status: StatusPembinaan = error ? 'gagal' : data ? 'siap' : 'memuat';
  const tersedia = Boolean(data?.akses?.baca);
  return { tersedia, wali: data?.akses?.sumber === 'wali', status, error, muatUlang: () => void load() };
}

/** Aplikasi sedang di depan (bukan pengalih aplikasi/layar kunci). */
function useAktif() {
  const [aktif, setAktif] = useState(AppState.currentState === 'active' || AppState.currentState === undefined);
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => setAktif(state === 'active'));
    return () => sub.remove();
  }, []);
  return aktif;
}

type KerangkaProps = {
  /** Judul umum layar (tanpa nama santri atau nominal). */
  title: string;
  subtitle?: string;
  /** Tindakan sekunder di balik ⋯ (lebih dari satu). */
  menu?: HeaderMenuItem[];
  /** Tombol ikon di kepala (mis. Muat ulang). */
  actions?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
};

/**
 * Halaman keuangan (redesain gelombang 2, pola P-Rincian/P-Form/P-Daftar):
 * kepala stack ← · judul · ⋯ di luar area gulir (K-7, K-10), isi bergulir,
 * dan bilah tombol tetap di bawah bila `bawah` diisi. Saat aplikasi tidak
 * aktif (pengalih aplikasi, layar kunci), isi ditutup; data server juga
 * dibuang oleh `usePrivateResource`.
 */
export function Halaman({ bawah, children, ...kepala }: KerangkaProps & { bawah?: ReactNode; children: ReactNode }) {
  const theme = useTheme();
  const aktif = useAktif();
  // iOS dapat mempertahankan pengukuran teks lama ketika Dynamic Type diubah
  // saat layar aktif (ruang kosong besar di kepala profil). Hanya area gulir
  // yang dipasang ulang; isian formulir disimpan di layar induk dan tetap ada.
  const { fontScale } = useWindowDimensions();
  // Teks sistem sangat besar: bilah tombol tetap dapat menutupi hampir seluruh
  // layar (dua tombol bertumpuk berteks besar), sehingga tombol ikut digulir
  // di akhir isi.
  const bilahTetap = Boolean(bawah) && fontScale <= 1.35;
  return (
    <StackScreen {...kepala}>
      <View style={styles.isi}>
        <KeyboardAwareScrollView
          key={`gulir-${fontScale}`}
          contentInsetAdjustmentBehavior="never"
          style={{ backgroundColor: theme.background }}
          contentContainerStyle={[styles.page, bilahTetap ? styles.pageBilah : null]}>
          {children}
          {bawah && !bilahTetap ? <View style={styles.tombolGulir}>{bawah}</View> : null}
        </KeyboardAwareScrollView>
        {bilahTetap ? <ActionBar>{bawah}</ActionBar> : null}
        {!aktif ? (
          <View style={[StyleSheet.absoluteFill, styles.cover, { backgroundColor: theme.background }]} accessibilityElementsHidden>
            <AppIcon name="lock" size={28} themeColor="textSecondary" />
            <ThemedText themeColor="textSecondary">Informasi keuangan disembunyikan.</ThemedText>
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
export function HalamanKeadaan({ children, ...kepala }: KerangkaProps & { children: ReactNode }) {
  return (
    <StackScreen {...kepala}>
      <View style={styles.keadaan}>{children}</View>
    </StackScreen>
  );
}

/** Tombol ikon "Muat ulang" di kepala layar. */
export function TombolMuatUlang({ onPress }: { onPress: () => void }) {
  return <IconButton icon="refresh" accessibilityLabel="Muat ulang" onPress={onPress} />;
}

/** Tombol "Cari" di dalam kolom cari: pencarian lewat server, bukan saringan lokal. */
export function TombolCari({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Cari" onPress={onPress} hitSlop={4}
      style={({ pressed }) => [styles.cari, { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 }]}>
      <ThemedText type="labelSmall" style={{ color: theme.onPrimary, fontWeight: '800' }}>Cari</ThemedText>
    </Pressable>
  );
}

/** Pil status keuangan: ikon + teks; "Menunggu" memakai jam, bukan centang. */
export function StatusBadge({ status }: { status: string }) {
  const { tone, icon } = nadaStatusKeuangan(status);
  return <StatusPill label={status} tone={tone} icon={icon} />;
}

/** Baris pil (status, rujukan) yang membungkus ke baris berikutnya. */
export function BarisPil({ children }: { children: ReactNode }) {
  return <View style={styles.barisPil}>{children}</View>;
}

/** Judul bagian dengan keterangan kecil opsional di kanan. */
export function JudulBagian({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return (
    <View style={styles.judulBagian}>
      <ThemedText selectable type="h2" accessibilityRole="header" style={styles.flex}>{title}</ThemedText>
      {trailing}
    </View>
  );
}

/** Kartu putih bersudut besar untuk blok isi (bagian rincian, isian formulir). */
export function Kartu({ children, gap = 12 }: { children: ReactNode; gap?: number }) {
  const theme = useTheme();
  return <View style={[styles.kartu, { gap, backgroundColor: theme.card, borderColor: theme.border, boxShadow: Elevation.card }]}>{children}</View>;
}

/**
 * Kartu konteks formulir: avatar inisial, nama, keterangan, dan angka
 * acuan. Label dan nilai berada dalam satu teks agar terbaca bersama
 * (mis. "Saldo tabungan Rp90.000").
 */
export function KartuSantri({ nama, keterangan, angka = [], children }: {
  nama: string;
  keterangan?: string;
  angka?: { label: string; nilai: string; tone?: 'danger' | 'warning' }[];
  children?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.kartu, { gap: 12, backgroundColor: theme.card, borderColor: theme.border, boxShadow: Elevation.card }]}>
      <View style={styles.santriBaris}>
        <AvatarInisial nama={nama} />
        <View style={styles.flex}>
          <ThemedText selectable type="bodyBold">{nama}</ThemedText>
          {keterangan ? <ThemedText selectable type="caption" themeColor="textSecondary">{keterangan}</ThemedText> : null}
        </View>
      </View>
      {angka.length > 0 ? (
        <View style={styles.angkaBaris}>
          {angka.map(a => (
            <View key={a.label} style={[styles.angkaSel, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText selectable type="labelSmall" themeColor="textSecondary">
                {a.label}{'\n'}
                <ThemedText type="numeralCard" themeColor={a.tone ?? 'text'}>{a.nilai}</ThemedText>
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** Pesan hasil/galat: ikon + teks (bukan warna saja). */
export function Pesan({ text, tone = 'info' }: { text: string | null; tone?: 'info' | 'danger' | 'success' }) {
  if (!text) return null;
  return <Notice text={text} tone={tone} />;
}

export function Penomoran({ page, total, perPage, onPage }: { page: number; total: number; perPage: number; onPage: (p: number) => void }) {
  const jumlah = Math.max(1, Math.ceil(total / Math.max(1, perPage)));
  if (jumlah <= 1) return null;
  return (
    <View style={styles.penomoran}>
      <AppButton label="Sebelumnya" size="sm" variant="secondary" disabled={page <= 1} onPress={() => onPage(page - 1)} style={styles.flex} />
      <ThemedText>{page}/{jumlah}</ThemedText>
      <AppButton label="Berikutnya" size="sm" variant="secondary" disabled={page >= jumlah} onPress={() => onPage(page + 1)} style={styles.flex} />
    </View>
  );
}

/** Kotak centang persetujuan/pernyataan (peran aksesibilitas checkbox). */
export function Centang({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked, disabled: Boolean(disabled) }} accessibilityLabel={label}
      disabled={disabled} onPress={() => onChange(!checked)} hitSlop={6} style={({ pressed }) => [styles.centang, { opacity: disabled ? 0.55 : pressed ? 0.8 : 1 }]}>
      <View style={[styles.kotak, { borderColor: checked ? theme.primary : theme.border, backgroundColor: checked ? theme.primary : theme.card }]}>
        {checked ? <AppIcon name="check" size={16} color={theme.onPrimary} /> : null}
      </View>
      <ThemedText style={styles.flex}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  isi: { flex: 1 },
  page: { paddingHorizontal: Layout.screen, paddingTop: 8, gap: Layout.cardGap, maxWidth: 760, width: '100%', alignSelf: 'center', paddingBottom: 56 },
  pageBilah: { paddingBottom: 24 },
  keadaan: { flex: 1, justifyContent: 'center' },
  tombolGulir: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 8 },
  cover: { alignItems: 'center', justifyContent: 'center', gap: 10 },
  barisPil: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  judulBagian: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 12 },
  kartu: { borderWidth: 1, borderRadius: Radius.xxl, borderCurve: 'continuous', padding: 16 },
  santriBaris: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  angkaBaris: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  angkaSel: { flexGrow: 1, flexBasis: 140, borderRadius: Radius.lg, padding: 12 },
  cari: { minHeight: 44, minWidth: 60, paddingHorizontal: 14, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', marginVertical: -6 },
  penomoran: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  centang: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  kotak: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
