import { useCallback, useEffect, useState, type PropsWithChildren } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { keuangan } from '@/api/keuangan';
import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/chip';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { useTheme } from '@/hooks/use-theme';
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

/**
 * Halaman keuangan. Saat aplikasi tidak aktif (pengalih aplikasi, layar
 * kunci), isi ditutup; data server juga dibuang oleh `usePrivateResource`.
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
          <ThemedText themeColor="textSecondary">Informasi keuangan disembunyikan.</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone = status === 'Menunggu' || status === 'Sebagian' || status === 'Belum dibayar' ? 'warning'
    : status === 'Dibatalkan' || status === 'Ditolak' ? 'danger'
    : status === 'Sah' || status === 'Lunas' || status === 'Terbit' ? 'primary' : 'neutral';
  return <Badge label={status} tone={tone} />;
}

/** Nominal besar di kartu ringkasan. */
export function Angka({ label, nilai, tone }: { label: string; nilai: string; tone?: 'danger' | 'success' }) {
  return (
    <View style={styles.angka}>
      <ThemedText type="caption" themeColor="textSecondary">{label}</ThemedText>
      <ThemedText type="h3" themeColor={tone} style={{ fontVariant: ['tabular-nums'] }}>{nilai}</ThemedText>
    </View>
  );
}

export function Penomoran({ page, total, perPage, onPage }: { page: number; total: number; perPage: number; onPage: (p: number) => void }) {
  const jumlah = Math.max(1, Math.ceil(total / Math.max(1, perPage)));
  if (jumlah <= 1) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
      <AppButton label="Sebelumnya" size="sm" variant="secondary" disabled={page <= 1} onPress={() => onPage(page - 1)} style={{ flex: 1 }} />
      <ThemedText>{page}/{jumlah}</ThemedText>
      <AppButton label="Berikutnya" size="sm" variant="secondary" disabled={page >= jumlah} onPress={() => onPage(page + 1)} style={{ flex: 1 }} />
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
      <ThemedText style={{ flex: 1 }}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centang: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  kotak: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  page: { padding: 18, gap: 14, maxWidth: 800, width: '100%', alignSelf: 'center', paddingBottom: 70 },
  cover: { alignItems: 'center', justifyContent: 'center' },
  angka: { gap: 2, minWidth: 130, flexGrow: 1 },
});
