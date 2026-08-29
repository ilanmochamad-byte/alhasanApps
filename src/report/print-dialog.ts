import * as Print from 'expo-print';

import { settlePrintDialog, type PrintDialogResult } from '@/report/print-errors';

/** Membuka dialog cetak dan mengubah pembatalan normal menjadi hasil eksplisit. */
export async function openSystemPrintDialog(options: Print.PrintOptions): Promise<PrintDialogResult> {
  return settlePrintDialog(() => Print.printAsync(options));
}
