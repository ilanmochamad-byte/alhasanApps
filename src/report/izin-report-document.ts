import { EncodingType, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { api } from '@/api/client';
import type { IzinLaporanFilters } from '@/api/types';
import { opsiCetakA4Lanskap, opsiPdfA4Lanskap } from '@/report/print-page';

/**
 * Cetak, simpan, dan bagikan laporan perizinan dari aplikasi (V2 Fase 5).
 *
 * Seluruh dokumen dibangun SERVER dari endpoint yang sama dengan website
 * (`/izin/laporan/cetak` dan `/izin/laporan/csv`). Aplikasi tidak pernah
 * menyusun laporannya sendiri, sehingga:
 *
 *   - dokumen aplikasi dan dokumen web identik untuk filter yang sama;
 *   - aturan cakupan tidak diduplikasi di sisi aplikasi;
 *   - CSV memuat SELURUH hasil filter, bukan halaman yang sedang terlihat.
 *
 * API yang dipakai seluruhnya resmi Expo SDK 57 dan sudah menjadi dependensi
 * proyek: `expo-print`, `expo-sharing`, dan `expo-file-system`. Tidak ada
 * kenaikan versi Expo maupun React Native.
 */

/** Batas aman ukuran CSV yang ditulis ke penyimpanan sementara perangkat. */
const BATAS_CSV_BYTE = 8 * 1024 * 1024;

function namaBerkasAman(nama: string, ekstensiDefault: string): string {
  // Buang pemisah direktori dan karakter yang tidak aman bagi nama berkas.
  const bersih = nama.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  if (bersih === '') {
    return `laporan-perizinan${ekstensiDefault}`;
  }
  return bersih.endsWith(ekstensiDefault) ? bersih : `${bersih}${ekstensiDefault}`;
}

/**
 * Membuka dialog cetak sistem. Pada web, `expo-print` membuka dialog cetak
 * peramban — perilaku resmi SDK 57.
 */
export async function cetakLaporanIzin(filters: IzinLaporanFilters) {
  const { html } = await api.izinLaporanCetak(filters);
  await Print.printAsync({ html, ...opsiCetakA4Lanskap });
}

/**
 * Membuat PDF lalu membukanya pada lembar berbagi sistem.
 *
 * Pada web tidak ada lembar berbagi berkas, sehingga jalur web kembali ke
 * dialog cetak (dari sana pengguna dapat memilih "Simpan sebagai PDF").
 */
export async function bagikanLaporanIzinPdf(filters: IzinLaporanFilters) {
  const { html } = await api.izinLaporanCetak(filters);

  if (process.env.EXPO_OS === 'web') {
    await Print.printAsync({ html, ...opsiCetakA4Lanskap });
    return;
  }

  const pdf = await Print.printToFileAsync({ html, ...opsiPdfA4Lanskap });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Dialog berbagi tidak tersedia pada perangkat ini. Gunakan tombol Cetak / PDF.');
  }
  await Sharing.shareAsync(pdf.uri, {
    dialogTitle: 'Bagikan laporan perizinan',
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
  });
}

/**
 * Menyimpan CSV seluruh hasil filter ke penyimpanan sementara aplikasi, lalu
 * membukanya pada lembar berbagi sistem.
 *
 * Berkas ditulis ke direktori cache aplikasi — bukan ke penyimpanan bersama —
 * sehingga data santri tidak tertinggal di folder yang dapat dibaca aplikasi
 * lain. Pengguna memilih sendiri tujuan akhirnya lewat lembar berbagi.
 *
 * @returns jumlah baris data pada CSV, sesuai laporan server.
 */
export async function bagikanLaporanIzinCsv(filters: IzinLaporanFilters): Promise<number> {
  const ekspor = await api.izinLaporanCsv(filters);

  if (ekspor.terpotong) {
    throw new Error(
      'Hasil filter melebihi batas ekspor. Persempit rentang tanggal atau filter lain lalu coba lagi.',
    );
  }

  const ukuran = ekspor.konten.length;
  if (ukuran > BATAS_CSV_BYTE) {
    throw new Error('Berkas CSV terlalu besar untuk dibagikan dari aplikasi. Gunakan unduhan lewat website.');
  }

  if (process.env.EXPO_OS === 'web') {
    throw new Error('Unduhan CSV pada peramban tersedia lewat halaman laporan website.');
  }

  // API berkas expo-file-system SDK 57: `Paths` + `File` (sinkron).
  // `Paths.cache` adalah direktori cache milik aplikasi ini sendiri — bukan
  // penyimpanan bersama — sehingga berkas tidak dapat dibaca aplikasi lain.
  const berkas = new File(Paths.cache, namaBerkasAman(ekspor.nama_berkas, '.csv'));
  berkas.create({ overwrite: true, intermediates: true });
  berkas.write(ekspor.konten, { encoding: EncodingType.UTF8 });

  if (!(await Sharing.isAvailableAsync())) {
    // Bersihkan berkas bila tidak jadi dibagikan, agar data santri tidak
    // tertinggal di cache tanpa alasan.
    if (berkas.exists) berkas.delete();
    throw new Error('Dialog berbagi tidak tersedia pada perangkat ini.');
  }

  await Sharing.shareAsync(berkas.uri, {
    dialogTitle: 'Bagikan laporan perizinan (CSV)',
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
  });

  return ekspor.jumlah_baris;
}
