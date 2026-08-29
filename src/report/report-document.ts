import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { api } from '@/api/client';
import type { ReportFilters } from '@/api/types';
import { openSystemPrintDialog } from '@/report/print-dialog';
import { opsiCetakA4Lanskap, opsiPdfA4Lanskap } from '@/report/print-page';

export async function openPrintDialog(filters: ReportFilters) {
  const { html } = await api.reportPrintHtml(filters);
  return openSystemPrintDialog({ html, ...opsiCetakA4Lanskap });
}

export async function shareReportPdf(filters: ReportFilters) {
  const { html } = await api.reportPrintHtml(filters);
  if (process.env.EXPO_OS === 'web') {
    await openSystemPrintDialog({ html, ...opsiCetakA4Lanskap });
    return;
  }
  const pdf = await Print.printToFileAsync({ html, ...opsiPdfA4Lanskap });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Dialog berbagi tidak tersedia pada perangkat ini. Gunakan tombol Cetak / PDF.');
  }
  await Sharing.shareAsync(pdf.uri, {
    dialogTitle: 'Bagikan laporan absensi',
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
  });
}
