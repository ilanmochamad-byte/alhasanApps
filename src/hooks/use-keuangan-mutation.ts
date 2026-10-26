import { ApiError } from '@/api/client';
import { useMutationGuard } from '@/hooks/use-mutation-guard';

/** Penolakan sesi/hak pada POST menutup data dan draf keuangan yang sudah terbuka. */
export function useKeuanganMutation(prefix: string, onDenied: (error: unknown) => void) {
  const guard = useMutationGuard(prefix);
  async function run<T>(fingerprint: string, operation: (key: string) => Promise<T>): Promise<T | null> {
    return guard.run(fingerprint, async key => {
      try {
        return await operation(key);
      } catch (error) {
        if (error instanceof ApiError && [401, 403, 404].includes(error.status)) onDenied(error);
        throw error;
      }
    });
  }
  return { ...guard, run };
}
