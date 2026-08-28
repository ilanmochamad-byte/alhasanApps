import * as Print from 'expo-print';

/**
 * Ukuran halaman cetak bersama untuk seluruh laporan aplikasi.
 *
 * MENGAPA ADA. `expo-print` (SDK 57) memakai bawaan **US Letter potret**
 * 612 × 792 piksel pada 72 PPI untuk `printAsync` maupun `printToFileAsync`
 * saat sumbernya HTML. Aturan `@page { size: A4 landscape }` di dalam HTML
 * TIDAK mengubahnya: mesin cetak WebKit di balik `expo-print` menentukan kotak
 * halaman dari opsi ini, bukan dari CSS. Akibatnya PDF dari aplikasi berukuran
 * Letter potret sementara laporan dirancang untuk A4 lanskap.
 *
 * Nilai di bawah diambil dari dokumentasi resmi Expo SDK 57
 * (https://docs.expo.dev/versions/v57.0.0/sdk/print/):
 *
 *   - `width` dan `height` tersedia di SELURUH platform selama sumbernya HTML,
 *     dengan bawaan 612 × 792 (US Letter, 72 PPI);
 *   - `orientation` HANYA tersedia pada iOS, dan hanya pada `printAsync`
 *     (`FilePrintOptions` milik `printToFileAsync` tidak memilikinya).
 *
 * A4 lanskap pada 72 PPI = 297 mm × 210 mm = 11,69 in × 8,27 in
 *                        = 841,89 × 595,28 → dibulatkan 842 × 595.
 *
 * Karena `width`/`height` berlaku lintas platform, ukuran kertas menjadi
 * DETERMINISTIK pada Android, iOS, dan web — tidak bergantung pada apakah
 * mesin cetak menghormati `@page`. `orientation` ditambahkan sebagai
 * pelengkap untuk dialog cetak iOS.
 *
 * Nomor halaman sendiri TIDAK bergantung pada ukuran kertas: server memecah
 * dokumen menjadi lembar dan menuliskan "Halaman i dari n" sebagai teks biasa
 * (lihat `app/Report/PrintLayout.php` pada repositori web).
 */
export const A4_LANSKAP = {
  width: 842,
  height: 595,
} as const;

/** Opsi `printAsync` untuk laporan: A4 lanskap, plus orientasi iOS. */
export const opsiCetakA4Lanskap: Print.PrintOptions = {
  ...A4_LANSKAP,
  orientation: Print.Orientation.landscape,
};

/** Opsi `printToFileAsync` untuk laporan: A4 lanskap lintas platform. */
export const opsiPdfA4Lanskap: Print.FilePrintOptions = {
  ...A4_LANSKAP,
};
