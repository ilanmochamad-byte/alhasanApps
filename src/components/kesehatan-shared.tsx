import { useCallback, useEffect, useState, type PropsWithChildren, type ReactNode } from 'react';
import { AppState, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { kesehatan, type Akses, type AksesWali, type Proyeksi } from '@/api/kesehatan';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/chip';
import { Panel } from '@/components/ui/surface';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { useTheme } from '@/hooks/use-theme';
import type { StatusPembinaan } from '@/lib/home-menu';

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
 * Halaman kesehatan. Saat aplikasi tidak aktif (pengalih aplikasi, layar
 * kunci), isi ditutup agar cuplikan layar OS tidak memuat isi kesehatan;
 * isian formulir tetap utuh di bawah penutup.
 */
export function Halaman({ children }: PropsWithChildren) {
  const theme = useTheme();
  const [aktif, setAktif] = useState(AppState.currentState === 'active' || AppState.currentState === undefined);
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => setAktif(state === 'active'));
    return () => sub.remove();
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.page}>
        {children}
      </ScrollView>
      {!aktif ? (
        <View style={[StyleSheet.absoluteFill, styles.cover, { backgroundColor: theme.background }]} accessibilityElementsHidden>
          <ThemedText themeColor="textSecondary">Informasi kesehatan disembunyikan.</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

export function Pesan({ text, tone = 'info' }: { text: string | null; tone?: 'info' | 'danger' | 'success' }) {
  if (!text) return null;
  return <ThemedText accessibilityRole="alert" themeColor={tone === 'danger' ? 'danger' : tone === 'success' ? 'success' : 'textSecondary'}>{text}</ThemedText>;
}

/** Label + nilai. Nilai kosong ditampilkan "—", sama dengan web. */
export function Baris({ label, value }: { label: string; value: ReactNode }) {
  return (
    <View style={styles.row}>
      <ThemedText type="caption" themeColor="textSecondary">{label}</ThemedText>
      {typeof value === 'string' || value === null || value === undefined
        ? <ThemedText>{value === null || value === undefined || value === '' ? '—' : value}</ThemedText>
        : value}
    </View>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone = status === 'Draf' || status === 'Menunggu hasil' || status === 'Terbuka' ? 'warning'
    : status === 'Ditarik' || status === 'Dinonaktifkan' || status === 'Berakhir' ? 'danger'
    : status === 'Tercatat' || status === 'Terbit' || status === 'Aktif' || status === 'Hasil diketahui' || status === 'Selesai' ? 'primary' : 'neutral';
  return <Badge label={status} tone={tone} />;
}

/** Proyeksi wali — dipakai pratinjau petugas, versi berlaku internal, dan layar wali sehingga ketiganya identik. */
export function KontenRingkasan({ p }: { p: Proyeksi }) {
  return (
    <Panel style={{ gap: 12 }}>
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
  page: { padding: 18, gap: 14, maxWidth: 800, width: '100%', alignSelf: 'center', paddingBottom: 70 },
  row: { gap: 3 },
  cover: { alignItems: 'center', justifyContent: 'center' },
});
