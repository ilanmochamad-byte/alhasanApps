import { useCallback, useEffect, useState, type PropsWithChildren, type ReactNode } from 'react';
import { AppState, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { izinWali, type PengajuanPetugas, type PengajuanWali } from '@/api/izin-wali';
import { AppButton } from '@/components/app-button';
import { tanggalPanjang } from '@/components/kesehatan-shared';
import type { HeaderMenuItem } from '@/components/screen-header';
import { StackScreen } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { ChipRow } from '@/components/ui/chip';
import { EntityRow } from '@/components/ui/entity-row';
import { InfoRow } from '@/components/ui/info-row';
import { Notice } from '@/components/ui/notice';
import { StatusPill, type StatusTone } from '@/components/ui/status-pill';
import { Layout } from '@/constants/theme';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { useTheme } from '@/hooks/use-theme';
import { LABEL_TAHAP, nadaStatus } from '@/izin-wali/forms';

// Komponen bersama layar izin wali V7. Alasan izin dan catatan tidak dibuat
// `selectable` dan tidak pernah dicetak ke konsol/log.

/** Akses V7 untuk pintu masuk di layar Perizinan. Modul belum dipasang (503/404) = tidak tersedia. */
export function useIzinWaliAkses() {
  const fetcher = useCallback(async () => {
    try { return await izinWali.akses(); } catch (e) {
      if (e instanceof ApiError && [404, 503].includes(e.status)) return null;
      throw e;
    }
  }, []);
  const { data, error, load } = usePrivateResource(fetcher);
  return { akses: data, error, muatUlang: () => void load() };
}

/**
 * Halaman izin wali (redesain gelombang 2): kepala stack ← · judul · ⋯ di luar
 * area gulir (K-10), isi bergulir, dan `footer` (ActionBar) atau `overlay`
 * (FAB) di luar gulir. Saat aplikasi tidak aktif (pengalih aplikasi, layar
 * kunci), isi ditutup agar cuplikan layar OS tidak memuat nama atau alasan;
 * isian formulir tetap utuh di bawah penutup.
 */
export function Halaman({
  title,
  menu,
  actions,
  onBack,
  footer,
  overlay,
  bottomSpace = 0,
  children,
}: PropsWithChildren<{
  title: string;
  menu?: HeaderMenuItem[];
  /** Tombol ikon di kepala (mis. Muat ulang). */
  actions?: ReactNode;
  onBack?: () => void;
  /** Bilah tindakan tetap di bawah, di luar area gulir. */
  footer?: ReactNode;
  /** Lapisan di atas isi (FAB). */
  overlay?: ReactNode;
  /** Ruang kosong tambahan di dasar daftar (mis. setinggi FAB + 16). */
  bottomSpace?: number;
}>) {
  const theme = useTheme();
  const [aktif, setAktif] = useState(AppState.currentState === 'active' || AppState.currentState === undefined);
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => setAktif(state === 'active'));
    return () => sub.remove();
  }, []);
  return (
    <StackScreen title={title} menu={menu} onBack={onBack} actions={actions}>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="never" style={{ backgroundColor: theme.background }}
          contentContainerStyle={[styles.page, { paddingBottom: 40 + bottomSpace }]}>
          {children}
        </ScrollView>
        {footer}
        {overlay}
        {!aktif ? (
          <View style={[StyleSheet.absoluteFill, styles.cover, { backgroundColor: theme.background }]} accessibilityElementsHidden>
            <ThemedText themeColor="textSecondary">Informasi perizinan disembunyikan.</ThemedText>
          </View>
        ) : null}
      </View>
    </StackScreen>
  );
}

/** Pesan hasil/galat: ikon + teks di kotak lunak; tidak dapat diseleksi. */
export function Pesan({ text, tone = 'info' }: { text: string | null; tone?: 'info' | 'danger' | 'success' }) {
  if (!text) return null;
  return <Notice text={text} tone={tone === 'info' ? 'neutral' : tone} selectable={false} />;
}

/** Label + nilai (pola `InfoRow`). Nilai kosong ditampilkan "—", sama dengan web. Tidak dapat diseleksi. */
export function Baris({ label, value, icon, last }: { label: string; value: ReactNode; icon?: Parameters<typeof InfoRow>[0]['icon']; last?: boolean }) {
  if (typeof value === 'string' || value === null || value === undefined) {
    return <InfoRow icon={icon} label={label} value={value === null || value === undefined || value === '' ? '—' : value} last={last} selectable={false} />;
  }
  return <InfoRow icon={icon} label={label} value="" last={last}>{value}</InfoRow>;
}

const NADA_PIL: Record<ReturnType<typeof nadaStatus>, StatusTone> = { neutral: 'neutral', primary: 'success', warning: 'warning', danger: 'danger' };

/** Pil status tahap: ikon + teks; nada dari status server. */
export function StatusIzin({ status, label }: { status: string; label: string }) {
  return <StatusPill label={label} tone={NADA_PIL[nadaStatus(status)]} />;
}

export function rentang(tglIzin: string, tglKembali: string): string {
  return tglIzin === tglKembali ? tanggalPanjang(tglIzin) : `${tanggalPanjang(tglIzin)} – ${tanggalPanjang(tglKembali)}`;
}

/** Baris daftar (pola `EntityRow`) untuk wali (pengaju/ringkas) dan petugas. */
export function KartuPengajuan({ item, onPress }: { item: PengajuanWali | PengajuanPetugas; onPress: () => void }) {
  const ringkas = 'ringkas' in item && item.ringkas;
  const pengaju = 'pengaju' in item ? item.pengaju : item.wali.nama ?? item.wali.akun ?? 'Wali';
  return (
    <EntityRow
      avatarName={item.santri.nama}
      title={item.santri.nama}
      subtitle={`#${item.id} · ${rentang(item.tgl_izin, item.tgl_kembali)} · diajukan ${ringkas ? 'wali lain' : pengaju}`}
      accessibilityLabel={`Buka pengajuan izin ${item.santri.nama} nomor ${item.id}`}
      onPress={onPress}
      pill={
        <ChipRow>
          <StatusIzin status={item.status} label={item.status_label} />
          {LABEL_TAHAP[item.tahap] !== undefined && LABEL_TAHAP[item.tahap].toLowerCase() !== item.status_label.toLowerCase() ? <StatusPill label={LABEL_TAHAP[item.tahap]} /> : null}
          {ringkas ? <StatusPill label="Status ringkas" icon="lock" /> : null}
        </ChipRow>
      }
    />
  );
}

export function Pager({ page, total, perPage, onChange }: { page: number; total: number; perPage: number; onChange: (next: number) => void }) {
  const jumlah = Math.max(1, Math.ceil(total / Math.max(1, perPage)));
  if (jumlah <= 1) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
      <AppButton label="Sebelumnya" size="sm" variant="secondary" disabled={page <= 1} onPress={() => onChange(page - 1)} style={{ flex: 1 }} />
      <ThemedText>{page}/{jumlah}</ThemedText>
      <AppButton label="Berikutnya" size="sm" variant="secondary" disabled={page >= jumlah} onPress={() => onChange(page + 1)} style={{ flex: 1 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: Layout.screen, paddingTop: 12, gap: Layout.cardGap, maxWidth: 760, width: '100%', alignSelf: 'center' },
  cover: { alignItems: 'center', justifyContent: 'center' },
});
