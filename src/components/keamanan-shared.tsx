import { useCallback, useEffect, useState, type PropsWithChildren, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { keamanan } from '@/api/keamanan';
import { AppIcon } from '@/components/app-icon';
import { TombolCariKecil } from '@/components/kesehatan-shared';
import { SearchBar } from '@/components/ui/search-bar';
import { HalamanStack, HalamanStackKeadaan, type KepalaHalaman } from '@/components/halaman-stack';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { StatusPill, type StatusTone } from '@/components/ui/status-pill';
import { usePrivateResource } from '@/hooks/use-private-resource';
import type { Nada } from '@/keamanan/format';

// Komponen bersama layar Keamanan (penugasan lintas guru/pengurus Fase 4).
// Seluruh layar HANYA MEMBACA: tidak ada formulir, tombol mutasi, atau unduhan.
// Alasan izin, uraian pelanggaran, dan isi konseling tidak dibuat `selectable`
// dan tidak pernah dicetak ke konsol/log.

/** Pintu Beranda. Server belum dipasangi Keamanan (404/503) = tidak tersedia. */
export function useKeamananAkses() {
  const fetcher = useCallback(async () => {
    try { return { akses: await keamanan.akses() }; } catch (e) {
      if (e instanceof ApiError && [404, 503].includes(e.status)) return { akses: null };
      throw e;
    }
  }, []);
  const { data, error, load } = usePrivateResource(fetcher);
  return {
    tersedia: Boolean(data?.akses?.pantau),
    status: (error ? 'gagal' : data !== null ? 'siap' : 'memuat') as 'gagal' | 'siap' | 'memuat',
    error,
    muatUlang: () => void load(),
  };
}

let nextKey = 0;

/**
 * Perlindungan native (`expo-screen-capture`, pola navigator kesehatan V5,
 * keuangan V6, dan izin wali V7) dipasang SEBELUM layar Keamanan mana pun
 * dimuat: tangkapan/rekaman layar dicegah dan cuplikan pengalih aplikasi tidak
 * memuat nama santri, alasan izin, atau catatan pembinaan. Binary tanpa modul
 * gagal tertutup: tidak ada data yang dimuat.
 */
export function KeamananProtection({ children }: PropsWithChildren) {
  const [key] = useState(() => `keamanan-${++nextKey}`);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(Platform.OS === 'web' ? 'ready' : 'loading');
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let mounted = true;
    const protection = (async () => {
      const capture = await import('expo-screen-capture');
      await capture.preventScreenCaptureAsync(key);
      if (Platform.OS === 'ios') await capture.enableAppSwitcherProtectionAsync(1);
      return capture;
    })();
    void protection.then(() => { if (mounted) setStatus('ready'); }, () => { if (mounted) setStatus('error'); });
    return () => {
      mounted = false;
      void protection.then(async capture => {
        if (Platform.OS === 'ios') await capture.disableAppSwitcherProtectionAsync();
        await capture.allowScreenCaptureAsync(key);
      }).catch(() => { /* Tidak ada layar Keamanan yang tampil bila gagal. */ });
    };
  }, [key, attempt]);
  // Saat perlindungan disiapkan atau gagal, kepala ← tetap tampil (K-10);
  // isi Keamanan belum dipasang sama sekali.
  if (status === 'error') {
    return (
      <HalamanKeadaan title="Keamanan">
        <ErrorState message="Perlindungan informasi Keamanan belum tersedia. Perbarui aplikasi lalu buka kembali."
          onRetry={() => { setStatus('loading'); setAttempt(v => v + 1); }} />
      </HalamanKeadaan>
    );
  }
  if (status !== 'ready') return <HalamanKeadaan title="Keamanan"><LoadingState label="Menyiapkan perlindungan informasi Keamanan…" /></HalamanKeadaan>;
  return children;
}

/**
 * Halaman Keamanan (redesain gelombang 2 Fase 4): kepala ← · judul di luar
 * area gulir (K-7, K-10), tanpa tombol tindakan. Saat aplikasi tidak aktif,
 * isi ditutup agar cuplikan OS tidak memuat data santri.
 */
export function Halaman({ children, ...kepala }: KepalaHalaman & { children: ReactNode }) {
  return <HalamanStack {...kepala} penutup="Informasi Keamanan disembunyikan.">{children}</HalamanStack>;
}

/** Memuat/galat/kosong/ditolak dalam kerangka yang sama: ← tetap terjangkau. */
export function HalamanKeadaan({ children, ...kepala }: KepalaHalaman & { children: ReactNode }) {
  return <HalamanStackKeadaan {...kepala}>{children}</HalamanStackKeadaan>;
}

const NADA_PIL: Record<Nada, StatusTone> = { neutral: 'neutral', primary: 'success', warning: 'warning', danger: 'danger' };

/** Pil status: ikon + teks (bukan warna saja); nada tetap dari pembantu `keamanan/format`. */
export function Lencana({ label, nada }: { label: string; nada: Nada }) {
  return <StatusPill label={label} tone={NADA_PIL[nada]} />;
}

/** Penanda kerahasiaan kasus: ikon gembok + teks dari server (mis. "Internal"). */
export function PilKerahasiaan({ label }: { label: string }) {
  return <StatusPill label={label} tone="neutral" icon="lock" />;
}

/**
 * Kolom cari nama/NIS (pencarian lewat server, menjangkau seluruh halaman) +
 * tombol penyaring opsional yang membuka lembar bawah (tanggal).
 */
export function KolomCariSantri({ value, onChange, onCari, label = 'Cari santri', filter, filterActive }: {
  value: string;
  onChange: (v: string) => void;
  onCari: () => void;
  label?: string;
  filter?: (tutup: () => void) => ReactNode;
  filterActive?: boolean;
}) {
  return (
    <SearchBar accessibilityLabel={label} placeholder="Nama atau NIS santri" value={value} onChangeText={onChange}
      maxLength={100} onSubmitEditing={onCari} filter={filter} filterTitle="Saring tanggal" filterActive={filterActive}
      trailing={<TombolCariKecil onPress={onCari} />} />
  );
}

/** Pengingat tetap di setiap layar: Keamanan hanya membaca. */
export function CatatanHanyaBaca({ text }: { text?: string }) {
  return (
    <View testID="keamanan-hanya-baca" style={styles.hanyaBaca}>
      <AppIcon name="eye" size={16} themeColor="textSecondary" />
      <ThemedText type="caption" themeColor="textSecondary" style={styles.flex}>
        {text ?? 'Hanya baca. Pencatatan, keputusan, dan koreksi dilakukan petugas yang berwenang. Cetak/PDF tersedia di website.'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  hanyaBaca: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingTop: 4 },
  flex: { flex: 1 },
});
