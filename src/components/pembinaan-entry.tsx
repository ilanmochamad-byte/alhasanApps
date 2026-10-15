import { useCallback } from 'react';
import { pembinaan } from '@/api/pembinaan';
import { usePrivateResource } from '@/hooks/use-private-resource';
import type { StatusPembinaan } from '@/lib/home-menu';

/**
 * Akses menu pembinaan untuk ubin Beranda. `tersedia` hanya benar bila server
 * melaporkan setidaknya satu kemampuan pembinaan; `error` berisi pesan bila
 * pemeriksaan gagal sehingga Beranda dapat menawarkan muat ulang.
 */
export function usePembinaanAkses() {
  const fetcher = useCallback(() => pembinaan.capabilities(), []);
  const { data, error, load } = usePrivateResource(fetcher);
  const tersedia = Boolean(data && Object.keys(data.capabilities).length > 0);
  const status: StatusPembinaan = error ? 'gagal' : data ? 'siap' : 'memuat';
  return { tersedia, status, error, muatUlang: () => void load() };
}
