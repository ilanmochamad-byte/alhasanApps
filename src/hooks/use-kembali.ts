import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { tujuanKembali } from '@/lib/kembali';

/**
 * Aksi tombol ← (K-10). Riwayat diperiksa saat ditekan, bukan saat layar
 * digambar, agar layar yang dibuka dari tautan lalu mendapat riwayat tetap
 * berperilaku benar.
 */
export function useKembali(varian: 'akar' | 'stack') {
  const router = useRouter();
  return useCallback(() => {
    if (tujuanKembali(varian, router.canGoBack()) === 'sebelumnya') router.back();
    else if (varian === 'akar') router.navigate('/');
    else router.replace('/');
  }, [router, varian]);
}
