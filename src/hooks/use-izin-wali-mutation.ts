import { ApiError } from '@/api/client';
import { useMutationGuard } from '@/hooks/use-mutation-guard';

/**
 * Penjaga mutasi izin wali V7: satu kunci idempotensi per isian (ketukan
 * ganda/retry jaringan → kunci sama), dan penolakan sesi/hak (401/403/404)
 * menutup data serta draf yang sudah terbuka, sama dengan modul keuangan V6.
 * Konflik 409 tidak pernah diulang otomatis; `onConflict` memberi tahu layar.
 */
export function useIzinWaliMutation(prefix: string, onDenied: (error: unknown) => void, onConflict?: () => void) {
  const guard = useMutationGuard(prefix);
  async function run<T>(fingerprint: string, operation: (key: string) => Promise<T>): Promise<T | null> {
    let ditolak = false;
    const hasil = await guard.run(fingerprint, async key => {
      try {
        return await operation(key);
      } catch (error) {
        if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
          ditolak = true;
          onDenied(error);
        }
        // Versi lama/benturan: server tidak mengubah apa pun; layar menawarkan muat ulang.
        if (error instanceof ApiError && error.status === 409) onConflict?.();
        throw error;
      }
    });
    // Pesan penolakan sudah tampil di layar induk; jangan bertahan di formulir.
    if (ditolak) guard.reset();
    return hasil;
  }
  return { ...guard, run };
}
