/**
 * Token desain Al Hasan Apps.
 *
 * Nilai warna inti (primary, background, card, border, text, textSecondary,
 * success, warning, danger) DIPERTAHANKAN dari versi sebelumnya. Yang
 * ditambahkan pada redesain V2 hanyalah turunan netral, permukaan lunak,
 * warna status kehadiran, serta skala radius/elevasi/tipografi — supaya nilai
 * yang dulu ditulis ad-hoc di tiap layar punya satu sumber kebenaran.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#17231C',
    textSecondary: '#5C6B61',
    /** V2: abu-hijau untuk label sekunder, placeholder, dan ikon nonaktif. */
    textMuted: '#8A9990',

    background: '#F4F7F4',
    backgroundElement: '#E9EFEA',
    backgroundSelected: '#D8E8DC',
    card: '#FFFFFF',
    border: '#DFE7E1',
    /** V2: garis pemisah di dalam kartu, lebih halus dari `border`. */
    divider: '#EEF3EF',

    primary: '#176B3A',
    onPrimary: '#FFFFFF',
    /** V2: keadaan tertekan untuk tombol primer. */
    primaryPressed: '#10552D',
    /** V2: latar lunak untuk chip, lencana, dan ikon beraksen. */
    primarySoft: '#E8F2EB',
    primaryBorder: '#CFE4D6',

    /** V2: permukaan kartu sorot di Beranda. */
    heroSurface: '#176B3A',
    heroBorder: '#176B3A',
    heroText: '#FFFFFF',
    heroTextSecondary: '#C4E7D1',
    heroAccent: '#A8DCBB',

    success: '#176B3A',
    warning: '#8B5A00',
    warningSoft: '#FDF3E2',
    warningBorder: '#F0DFBE',
    danger: '#B42318',
    dangerSoft: '#FDECEA',
    dangerBorder: '#F0CFCB',

    /**
     * Warna status kehadiran. Urutannya sengaja Hadir → Izin → Terlambat →
     * Sakit → Alpa: pada batang rekap laporan urutan itulah yang lolos uji
     * keterbedaan bagi pengguna buta warna.
     */
    statusHadir: '#176B3A',
    statusIzin: '#1C82B8',
    statusTerlambat: '#B07A12',
    statusSakit: '#8A3FBF',
    statusAlpa: '#B42318',
  },
  dark: {
    text: '#F2F7F3',
    textSecondary: '#A9BAAE',
    textMuted: '#7F9187',

    background: '#0D1711',
    backgroundElement: '#1A2820',
    backgroundSelected: '#264331',
    card: '#132019',
    border: '#2A3B30',
    divider: '#22322A',

    primary: '#62C985',
    onPrimary: '#082611',
    primaryPressed: '#8FE0AB',
    primarySoft: '#17331F',
    primaryBorder: '#2F5C3F',

    /** Kartu sorot memakai hijau tua: mengisinya dengan `primary` menyilaukan. */
    heroSurface: '#1B4E31',
    heroBorder: '#2F6A45',
    heroText: '#F2F7F3',
    heroTextSecondary: '#C4E7D1',
    heroAccent: '#8FE0AB',

    success: '#62C985',
    warning: '#F4BE62',
    warningSoft: '#33280F',
    warningBorder: '#5C4A1C',
    danger: '#FF8A80',
    dangerSoft: '#3A1C19',
    dangerBorder: '#6B2A24',

    statusHadir: '#62C985',
    statusIzin: '#6FC2E8',
    statusTerlambat: '#E0AE4A',
    statusSakit: '#C08BE8',
    statusAlpa: '#FF8A80',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type ThemePalette = (typeof Colors)['light'];

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
  brand: '0 8px 22px rgba(23, 107, 58, 0.22)',
  bar: '0 -6px 20px rgba(18, 42, 25, 0.06)',
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
} as const;

/**
 * V2: tinggi sentuh minimum. Chip yang tampil lebih pendek WAJIB memakai
 * `hitSlop` agar area sentuhnya tetap memenuhi pedoman aksesibilitas.
 */
export const TouchTarget = 44;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
