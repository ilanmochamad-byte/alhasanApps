/**
 * iOS menolak Promise `printAsync` ketika pengguna menutup dialog tanpa
 * memulai pencetakan. Expo SDK 57 melaporkannya sebagai
 * `PrintIncompleteException: Printing did not complete`.
 *
 * Kondisi itu adalah pilihan pengguna, bukan kegagalan aplikasi. Pencocokan
 * sengaja sempit agar galat printer, HTML, atau native lain tetap terlihat.
 */
export function isPrintDialogCancellation(caught: unknown): boolean {
  const bagian: string[] = [];

  if (caught instanceof Error) {
    bagian.push(caught.name, caught.message);
  } else if (typeof caught === 'string') {
    bagian.push(caught);
  }

  if (typeof caught === 'object' && caught !== null) {
    const kandidat = caught as { code?: unknown; name?: unknown; message?: unknown };
    for (const nilai of [kandidat.code, kandidat.name, kandidat.message]) {
      if (typeof nilai === 'string') bagian.push(nilai);
    }
  }

  const pesan = bagian.join(' ');
  return /PrintIncompleteException|Printing did not complete/i.test(pesan);
}

export type PrintDialogResult = 'dimulai' | 'dibatalkan';

/** Menormalkan hasil Promise native tanpa menyembunyikan galat sebenarnya. */
export async function settlePrintDialog(operation: () => Promise<void>): Promise<PrintDialogResult> {
  try {
    await operation();
    return 'dimulai';
  } catch (caught) {
    if (isPrintDialogCancellation(caught)) return 'dibatalkan';
    throw caught;
  }
}
