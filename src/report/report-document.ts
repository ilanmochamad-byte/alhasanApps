import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { api } from '@/api/client';
import type { ReportFilters } from '@/api/types';

export async function openPrintDialog(filters: ReportFilters) {
  const { html } = await api.reportPrintHtml(filters);
  await Print.printAsync({ html });
}

export async function shareReportPdf(filters: ReportFilters) {
  const { html } = await api.reportPrintHtml(filters);
  if (process.env.EXPO_OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const pdf = await Print.printToFileAsync({ html });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Dialog berbagi tidak tersedia pada perangkat ini. Gunakan tombol Cetak / PDF.');
  }
  await Sharing.shareAsync(pdf.uri, {
    dialogTitle: 'Bagikan laporan absensi',
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
  });
}
