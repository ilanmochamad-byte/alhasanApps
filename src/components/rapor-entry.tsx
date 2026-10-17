import { useCallback } from 'react';
import { rapor } from '@/api/rapor';
import { usePrivateResource } from '@/hooks/use-private-resource';
import type { StatusPembinaan } from '@/lib/home-menu';
export function useRaporAkses() {
  const fetcher = useCallback(() => rapor.capabilities(), []);
  const { data, error, load } = usePrivateResource(fetcher);
  const status: StatusPembinaan = error ? 'gagal' : data ? 'siap' : 'memuat';
  return { tersedia: Boolean(data?.list.length), status, error, muatUlang: () => void load() };
}
