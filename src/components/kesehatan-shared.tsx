import { useCallback, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { kesehatan, type Akses, type AksesWali, type Proyeksi } from '@/api/kesehatan';
import { AppIcon } from '@/components/app-icon';
import { HalamanStack, HalamanStackKeadaan, type KepalaHalaman } from '@/components/halaman-stack';
import { ThemedText } from '@/components/themed-text';
import { Notice } from '@/components/ui/notice';
import { StatusPill } from '@/components/ui/status-pill';
import { Panel } from '@/components/ui/surface';
import { Radius } from '@/constants/theme';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { useTheme } from '@/hooks/use-theme';
import type { StatusPembinaan } from '@/lib/home-menu';
import { nadaStatusKesehatan } from '@/kesehatan/forms';

// Komponen bersama layar kesehatan V5. Isi klinis tidak dibuat `selectable`
// (tidak ada salin otomatis) dan tidak pernah dicetak ke konsol/log.

/** Akses kesehatan untuk ubin Beranda. Modul belum dipasang (503) = tidak tersedia, bukan galat. */
export function useKesehatanAkses() {
  const fetcher = useCallback(async () => {
    const lunak = async <T,>(p: Promise<T>): Promise<T | null> => {
      try { return await p; } catch (e) { if (e instanceof ApiError && [404, 503].includes(e.status)) return null; throw e; }
    };
    const [akses, wali] = await Promise.all([lunak(kesehatan.akses()), lunak(kesehatan.aksesWali())]);
    return { akses, wali };
  }, []);
  const { data, error, load } = usePrivateResource(fetcher);
  const status: StatusPembinaan = error ? 'gagal' : data ? 'siap' : 'memuat';
  const internal = Boolean(data?.akses?.baca);
  const wali = Boolean(data?.wali?.wali);
  return { tersedia: internal || wali, internal, wali, label: internal ? 'Kesehatan' : 'Kesehatan anak', status, error, muatUlang: () => void load() };
}

export type AksesGabungan = { akses: Akses | null; wali: AksesWali | null };

/**
 * Halaman kesehatan (redesain gelombang 2 Fase 4): kepala ← · judul · ⋯ di
 * luar area gulir (K-7, K-10). Saat aplikasi tidak aktif (pengalih aplikasi,
 * layar kunci), isi ditutup agar cuplikan layar OS tidak memuat isi
 * kesehatan; isian formulir tetap utuh di bawah penutup.
 */
export function Halaman({ children, ...kepala }: KepalaHalaman & { bawah?: ReactNode; children: ReactNode }) {
  return <HalamanStack {...kepala} penutup="Informasi kesehatan disembunyikan.">{children}</HalamanStack>;
}

/** Memuat/galat/kosong/ditolak dalam kerangka yang sama: ← tetap terjangkau. */
export function HalamanKeadaan({ children, ...kepala }: KepalaHalaman & { children: ReactNode }) {
  return <HalamanStackKeadaan {...kepala}>{children}</HalamanStackKeadaan>;
}

/** Pesan hasil/galat: ikon + teks (bukan warna saja). */
export function Pesan({ text, tone = 'info' }: { text: string | null; tone?: 'info' | 'danger' | 'success' }) {
  if (!text) return null;
  return <Notice text={text} tone={tone} />;
}

/** Tombol "Cari" di dalam kolom cari: pencarian lewat server, bukan saringan lokal. */
export function TombolCariKecil({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Cari" onPress={onPress} hitSlop={4}
      style={({ pressed }) => [styles.cari, { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 }]}>
      <ThemedText type="labelSmall" style={{ color: theme.onPrimary, fontWeight: '800' }}>Cari</ThemedText>
    </Pressable>
  );
}

/** Label + nilai. Nilai kosong ditampilkan "—", sama dengan web. */
export function Baris({ label, value, last }: { label: string; value: ReactNode; last?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: theme.divider }]}>
      <ThemedText type="labelSmall" themeColor="textSecondary">{label}</ThemedText>
      {typeof value === 'string' || value === null || value === undefined
        ? <ThemedText type="bodyBold">{value === null || value === undefined || value === '' ? '—' : value}</ThemedText>
        : value}
    </View>
  );
}

/** Pil status kesehatan: ikon + teks. Draf/menunggu = jam, tercatat/berlaku = centang, ditarik/berakhir = silang. */
export function StatusBadge({ status }: { status: string }) {
  return <StatusPill label={status} tone={nadaStatusKesehatan(status)} />;
}

/** Penanda kecil (jumlah obat, rujukan, "Perlu perhatian"): ikon + teks. */
export function Penanda({ label, nada = 'neutral' }: { label: string; nada?: 'neutral' | 'warning' | 'danger' | 'success' }) {
  return <StatusPill label={label} tone={nada} icon={nada === 'neutral' ? 'info' : undefined} />;
}

/** Proyeksi wali — dipakai pratinjau petugas, versi berlaku internal, dan layar wali sehingga ketiganya identik. */
export function KontenRingkasan({ p }: { p: Proyeksi }) {
  return (
    <Panel style={{ gap: 4 }}>
      <View style={styles.kop}>
        <AppIcon name="medical" size={20} themeColor="primary" />
        <ThemedText type="bodyBold" style={{ flex: 1 }}>Informasi kesehatan untuk orang tua</ThemedText>
        <StatusBadge status={p.status} />
      </View>
      <Baris label="Santri" value={p.santri.nama} />
      <Baris label="Tanggal kunjungan klinik" value={tanggalPanjang(p.tanggal_kunjungan)} />
      <Baris label="Dari" value="Klinik Pesantren Al Hasan" />
      {p.status === 'Ditarik' ? (
        <ThemedText type="bodyBold">Informasi ini telah ditarik oleh pesantren.</ThemedText>
      ) : (
        <>
          <Baris label="Ringkasan" value={p.ringkasan} />
          {p.tindakan_umum ? <Baris label="Penanganan di klinik" value={p.tindakan_umum} /> : null}
          {p.tindak_lanjut_wali ? <Baris label="Yang perlu diperhatikan orang tua" value={p.tindak_lanjut_wali} /> : null}
          {p.diperbarui ? <ThemedText type="caption" themeColor="textSecondary">Informasi ini diperbarui pesantren setelah pertama terbit.</ThemedText> : null}
        </>
      )}
      <ThemedText type="caption" themeColor="textSecondary">Diterbitkan {waktuPendek(p.diterbitkan_pada)} · versi {p.versi}</ThemedText>
    </Panel>
  );
}

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/** `YYYY-MM-DD` → "24 Oktober 2026" tanpa bergantung zona waktu perangkat. */
export function tanggalPanjang(iso: string | null): string {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} ${BULAN[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
}

/** `YYYY-MM-DD HH:mm:ss` → "24 Oktober 2026 09.30" (waktu server apa adanya). */
export function waktuPendek(nilai: string | null): string {
  if (!nilai) return '—';
  const jam = /\d{2}:\d{2}/.exec(nilai.slice(10))?.[0];
  return `${tanggalPanjang(nilai)}${jam ? ` ${jam.replace(':', '.')}` : ''}`;
}

const styles = StyleSheet.create({
  row: { gap: 3, paddingVertical: 10 },
  cari: { minHeight: 44, minWidth: 60, paddingHorizontal: 14, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', marginVertical: -6 },
  kop: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 6 },
});
