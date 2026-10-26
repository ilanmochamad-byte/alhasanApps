import { ApiError } from '@/api/client';
import { useMutationGuard } from '@/hooks/use-mutation-guard';

/** Penolakan sesi/hak pada POST menutup data dan draf keuangan yang sudah terbuka. */
export function useKeuanganMutation(prefix: string, onDenied: (error: unknown) => void) {
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
        throw error;
      }
    });
    // Pesan penolakan sudah tampil di layar induk; jangan bertahan di formulir
    // sesudah hak dipulihkan dan data dimuat ulang lewat "Coba lagi".
    if (ditolak) guard.reset();
    return hasil;
  }
  return { ...guard, run };
}
