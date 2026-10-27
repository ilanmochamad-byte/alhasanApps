import { useCallback, useEffect, useState, type PropsWithChildren, type ReactNode } from 'react';
import { AppState, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { izinWali, type PengajuanPetugas, type PengajuanWali } from '@/api/izin-wali';
import { AppButton } from '@/components/app-button';
import { tanggalPanjang } from '@/components/kesehatan-shared';
import { ThemedText } from '@/components/themed-text';
import { Badge, ChipRow } from '@/components/ui/chip';
import { Card } from '@/components/ui/surface';
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
 * Halaman izin wali. Saat aplikasi tidak aktif (pengalih aplikasi, layar
 * kunci), isi ditutup agar cuplikan layar OS tidak memuat nama atau alasan;
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
          <ThemedText themeColor="textSecondary">Informasi perizinan disembunyikan.</ThemedText>
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

export function StatusIzin({ status, label }: { status: string; label: string }) {
  return <Badge label={label} tone={nadaStatus(status)} />;
}

export function rentang(tglIzin: string, tglKembali: string): string {
  return tglIzin === tglKembali ? tanggalPanjang(tglIzin) : `${tanggalPanjang(tglIzin)} – ${tanggalPanjang(tglKembali)}`;
}

/** Kartu daftar untuk wali (pengaju/ringkas) dan petugas. */
export function KartuPengajuan({ item, onPress }: { item: PengajuanWali | PengajuanPetugas; onPress: () => void }) {
  const ringkas = 'ringkas' in item && item.ringkas;
  const pengaju = 'pengaju' in item ? item.pengaju : item.wali.nama ?? item.wali.akun ?? 'Wali';
  return (
    <Card accessibilityLabel={`Buka pengajuan izin ${item.santri.nama} nomor ${item.id}`} onPress={onPress}>
      <View style={{ gap: 6 }}>
        <ThemedText type="bodyBold">{item.santri.nama}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          #{item.id} · {rentang(item.tgl_izin, item.tgl_kembali)} · diajukan {ringkas ? 'wali lain' : pengaju}
        </ThemedText>
        <ChipRow>
          <StatusIzin status={item.status} label={item.status_label} />
          {LABEL_TAHAP[item.tahap] !== undefined && LABEL_TAHAP[item.tahap].toLowerCase() !== item.status_label.toLowerCase() ? <Badge label={LABEL_TAHAP[item.tahap]} /> : null}
          {ringkas ? <Badge label="Status ringkas" /> : null}
        </ChipRow>
      </View>
    </Card>
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
  page: { padding: 18, gap: 14, maxWidth: 800, width: '100%', alignSelf: 'center', paddingBottom: 70 },
  row: { gap: 3 },
  cover: { alignItems: 'center', justifyContent: 'center' },
});
