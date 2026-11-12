/**
 * Warna Al Hasan Apps — berkas murni tanpa impor agar dapat diuji di Node
 * (`tests/redesain-v2-kontras.test.ts`). `constants/theme.ts` mengekspor ulang.
 *
 * Redesain gelombang 2 (K-1, 12 Nov 2026): latar krem hangat, garis hangat,
 * hijau utama dan kartu sorot lebih tua. Warna status kehadiran, `success`,
 * `warning`, `danger`, `info`, dan `violet` TIDAK berubah. `textMuted` terang
 * digelapkan (#8A9990 → #5F6D64) agar teks kecil di atas latar krem, kartu, dan kolom cari
 * mencapai 4,5:1.
 */
export const Colors = {
  light: {
    text: '#17231C',
    textSecondary: '#5C6B61',
    /** V2: abu-hijau untuk label sekunder, placeholder, dan ikon nonaktif. */
    textMuted: '#5F6D64',

    background: '#F6F4EE',
    backgroundElement: '#EEEBE2',
    backgroundSelected: '#D8E8DC',
    card: '#FFFFFF',
    border: '#E7E2D6',
    /** V2: garis pemisah di dalam kartu, lebih halus dari `border`. */
    divider: '#F1EEE6',

    primary: '#1B5E3F',
    onPrimary: '#FFFFFF',
    /** V2: keadaan tertekan untuk tombol primer. */
    primaryPressed: '#144A31',
    /** V2: latar lunak untuk chip, lencana, dan ikon beraksen. */
    primarySoft: '#E8F2EB',
    primaryBorder: '#CFE4D6',

    /** V2: permukaan kartu sorot di Beranda. */
    heroSurface: '#174D36',
    heroBorder: '#174D36',
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

    /** Redesain tampilan: aksen ubin menu Beranda (laporan/cetak, pembinaan). */
    info: '#1C6A96',
    infoSoft: '#E6F1F8',
    violet: '#7A35AB',
    violetSoft: '#F3EAFA',

    /** Gelombang 2 (K-1): emas hiasan saja (garis/ikon); TIDAK membawa makna status. */
    accentGold: '#C9962B',
  },
  dark: {
    text: '#F2F7F3',
    textSecondary: '#A9BAAE',
    textMuted: '#7F9187',

    background: '#0D1711',
    backgroundElement: '#1A2820',
    backgroundSelected: '#264331',
    card: '#132019',
    border: '#2C3A31',
    divider: '#22322A',

    primary: '#62C985',
    onPrimary: '#082611',
    primaryPressed: '#8FE0AB',
    primarySoft: '#17331F',
    primaryBorder: '#2F5C3F',

    /** Kartu sorot memakai hijau tua: mengisinya dengan `primary` menyilaukan. */
    heroSurface: '#163F2D',
    heroBorder: '#2A5E44',
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

    info: '#6FC2E8',
    infoSoft: '#14293A',
    violet: '#C08BE8',
    violetSoft: '#2A1C38',

    accentGold: '#D9B25A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type ThemePalette = (typeof Colors)['light'];
