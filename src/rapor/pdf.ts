import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { requestPdf } from '@/api/client';

/** Called only by explicit user action. No URL with credentials, regeneration or persistent cache. */
export async function downloadReport(id: number, version: number, stillActive: () => boolean) {
  if (process.env.EXPO_OS !== 'web' && !(await Sharing.isAvailableAsync())) throw new Error('Dialog simpan/bagikan tidak tersedia.');
  const bytes = await requestPdf(`/v4/rapor/${id}/pdf/${version}`);
  if (!stillActive()) return;
  if (process.env.EXPO_OS === 'web') {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `rapor-${id}-v${version}.pdf`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  // Cache app (bukan Documents), dihapus setelah dialog selesai termasuk saat gagal.
  const file = new File(Paths.cache, `v4-rapor-${id}-${version}-${Date.now()}.pdf`);
  try {
    file.write(new Uint8Array(bytes));
    if (stillActive()) await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Simpan atau bagikan rapor' });
  } finally { if (file.exists) file.delete(); }
}

/** Bersihkan residu cache akibat proses aplikasi dihentikan saat dialog terbuka. */
export function clearReportCache() {
  if (process.env.EXPO_OS === 'web') return;
  for (const entry of Paths.cache.list()) if (entry instanceof File && /^v4-rapor-.*\.pdf$/.test(entry.name)) entry.delete();
}
