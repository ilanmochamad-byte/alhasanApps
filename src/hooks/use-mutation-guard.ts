import { useCallback, useRef, useState } from 'react';

import { ApiError, actionableError, createIdempotencyKey } from '@/api/client';

/**
 * Penjaga mutasi perizinan (PRD V2 Fase 3 §9).
 *
 * Tiga jaminan:
 *   1. Selama satu request berjalan, `isBusy` bernilai true sehingga tombol
 *      dinonaktifkan dan ketukan berikutnya diabaikan — request tidak pernah
 *      terkirim dua kali.
 *   2. Satu operasi memakai SATU kunci idempotensi. Percobaan ulang setelah
 *      gagal (jaringan putus, timeout, 5xx) memakai kunci yang SAMA sehingga
 *      server memutar ulang respons alih-alih membuat data tambahan.
 *   3. Kunci baru hanya dibuat setelah operasi benar-benar berhasil, atau
 *      setelah pengguna mengubah isian dan memanggil `reset()`.
 */
export function useMutationGuard(prefix: string) {
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keyRef = useRef<string | null>(null);
  const inFlight = useRef(false);

  const idempotencyKey = useCallback(() => {
    if (keyRef.current === null) keyRef.current = createIdempotencyKey(prefix);
    return keyRef.current;
  }, [prefix]);

  const reset = useCallback(() => {
    keyRef.current = null;
    setError(null);
  }, []);

  /**
   * Menjalankan satu mutasi. Mengembalikan hasilnya bila berhasil, atau `null`
   * bila gagal / diabaikan karena masih ada request berjalan.
   */
  const run = useCallback(
    async <T,>(operation: (key: string) => Promise<T>): Promise<T | null> => {
      if (inFlight.current) return null;
      inFlight.current = true;
      setBusy(true);
      setError(null);
      try {
        const result = await operation(idempotencyKey());
        // Sukses: kunci berikutnya harus baru agar operasi berikutnya tidak
        // dianggap sebagai pemutaran ulang operasi ini.
        keyRef.current = null;
        return result;
      } catch (caught) {
        setError(actionableError(caught));
        if (caught instanceof ApiError && (caught.status === 409 || caught.status === 422 || caught.status === 403)) {
          // Permintaan sudah sampai dan ditolak server. Percobaan berikutnya
          // adalah permintaan BARU, jadi kuncinya juga harus baru.
          keyRef.current = null;
        }
        return null;
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [idempotencyKey],
  );

  return { isBusy, error, setError, run, reset, idempotencyKey };
}
