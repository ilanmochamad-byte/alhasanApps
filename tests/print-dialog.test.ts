import assert from 'node:assert/strict';
import test from 'node:test';

import { isPrintDialogCancellation, settlePrintDialog } from '../src/report/print-errors.ts';

test('mengenali exception pembatalan cetak iOS dari nama dan pesan', () => {
  const error = new Error('Printing did not complete (at ExpoPrint/ExpoPrintWithPrinter.swift:94)');
  error.name = 'PrintIncompleteException';

  assert.equal(isPrintDialogCancellation(error), true);
});

test('mengenali bentuk CodedError dari bridge native', () => {
  assert.equal(
    isPrintDialogCancellation({ code: 'PrintIncompleteException', message: 'Printing did not complete' }),
    true,
  );
});

test('tidak menyembunyikan kegagalan cetak yang sebenarnya', () => {
  assert.equal(isPrintDialogCancellation(new Error('Printer tidak dapat dihubungi')), false);
  assert.equal(isPrintDialogCancellation({ code: 'ERR_PRINT_FAILED', message: 'Printing job failed' }), false);
});

test('mengembalikan hasil normal ketika pencetakan dimulai', async () => {
  assert.equal(await settlePrintDialog(async () => undefined), 'dimulai');
});

test('mengubah penutupan dialog menjadi hasil dibatalkan', async () => {
  assert.equal(
    await settlePrintDialog(async () => {
      throw new Error('PrintIncompleteException: Printing did not complete');
    }),
    'dibatalkan',
  );
});

test('meneruskan kegagalan printer tanpa perubahan', async () => {
  const kegagalan = new Error('Printer tidak dapat dihubungi');
  await assert.rejects(() => settlePrintDialog(async () => { throw kegagalan; }), kegagalan);
});
