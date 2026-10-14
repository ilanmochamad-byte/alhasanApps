import { useCallback } from 'react';
import { pembinaan } from '@/api/pembinaan';
import { usePrivateResource } from '@/hooks/use-private-resource';

/**
 * Akses menu pembinaan untuk ubin Beranda. `tersedia` hanya benar bila server
 * melaporkan setidaknya satu kemampuan pembinaan; `error` berisi pesan bila
 * pemeriksaan gagal sehingga Beranda dapat menawarkan muat ulang.
 */
export function usePembinaanAkses() {
  const fetcher = useCallback(() => pembinaan.capabilities(), []);
  const { data, error, load } = usePrivateResource(fetcher);
  const tersedia = Boolean(data && Object.keys(data.capabilities).length > 0);
  return { tersedia, error, muatUlang: () => void load() };
}
