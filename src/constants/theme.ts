/**
 * Token desain Al Hasan Apps.
 *
 * Warna ada di `constants/colors.ts` (berkas murni agar dapat diuji kontrasnya
 * di Node). Berkas ini memuat huruf, jarak, radius, elevasi, dan skala
 * tipografi — satu sumber kebenaran untuk nilai yang dipakai semua layar.
 */

import '@/global.css';

import { Platform } from 'react-native';

export { Colors, type ThemeColor, type ThemePalette } from './colors';

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** V2: satu tangga radius supaya tiap layar tidak memilih angkanya sendiri. */
export const Radius = {
  /** chip, lencana, tombol mengambang */
  pill: 999,
  /** input kecil, ikon persegi */
  sm: 12,
  /** tombol, input, kolom cari */
  md: 14,
  /** ikon persegi besar, kartu ringkas */
  lg: 16,
  /** kartu daftar */
  xl: 18,
  /** panel */
  xxl: 20,
  /** kartu sorot, kartu login */
  hero: 22,
} as const;

/**
 * V2: elevasi. Nilai `boxShadow` dipakai apa adanya oleh React Native 0.86
 * pada ketiga platform.
 */
export const Elevation = {
  card: '0 1px 2px rgba(18, 42, 25, 0.04)',
  raised: '0 10px 32px rgba(18, 42, 25, 0.08)',
  brand: '0 8px 22px rgba(23, 77, 54, 0.22)',
  bar: '0 -6px 20px rgba(18, 42, 25, 0.06)',
  /** Gelombang 2: tombol mengambang (K-8). */
  floating: '0 12px 28px rgba(23, 77, 54, 0.28)',
} as const;

/** V2: skala tipografi. Dipakai lewat `ThemedText type=…`. */
export const Type = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.5 },
  h1: { fontSize: 26, lineHeight: 32, fontWeight: '800', letterSpacing: -0.4 },
  h2: { fontSize: 17, lineHeight: 22, fontWeight: '800' },
  h3: { fontSize: 15, lineHeight: 20, fontWeight: '800' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '500' },
  bodyBold: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  label: { fontSize: 13, lineHeight: 17, fontWeight: '800' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '800', letterSpacing: 0.6 },
  numeral: { fontSize: 30, lineHeight: 34, fontWeight: '800' },
  /** Gelombang 2 §3.2: judul tengah layar stack. */
  stackTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  /** Gelombang 2 §3.2: angka besar kartu sorot. */
  numeralLarge: { fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -0.4 },
  /** Gelombang 2 §3.2: angka kartu statistik. */
  numeralCard: { fontSize: 22, lineHeight: 28, fontWeight: '800' },
  /** Gelombang 2 §3.2: label kecil. */
  labelSmall: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
} as const;

/** Gelombang 2 §3.2: jarak tepi layar, antar-kartu, dan antar-bagian. */
export const Layout = { screen: 20, cardGap: 12, sectionGap: 24 } as const;

/**
 * Redesain tampilan (14 Okt 2026): huruf merek Plus Jakarta Sans.
 *
 * Setiap ketebalan adalah keluarga huruf tersendiri — Android tidak memilih
 * berkas berdasarkan `fontWeight` untuk huruf yang dimuat saat berjalan, dan
 * bila dibiarkan ia menebalkan huruf secara tiruan. Karena itu `ThemedText`
 * menerjemahkan `fontWeight` menjadi nama keluarga lewat `brandFontFamily`.
 * Ketebalan di bawah 500 sengaja dipetakan ke 500 agar teks tetap mudah dibaca.
 */
export const BrandFont = {
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export function brandFontFamily(weight: string | number | undefined) {
  const value = weight === 'bold' ? 700 : Number(weight);
  if (!Number.isFinite(value) || value <= 500) return BrandFont.medium;
  if (value <= 600) return BrandFont.semibold;
  if (value <= 700) return BrandFont.bold;
  return BrandFont.extrabold;
}

/**
 * V2: tinggi sentuh minimum. Chip yang tampil lebih pendek WAJIB memakai
 * `hitSlop` agar area sentuhnya tetap memenuhi pedoman aksesibilitas.
 */
export const TouchTarget = 44;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
