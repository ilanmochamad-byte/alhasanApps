import { Image } from 'expo-image';

/**
 * Logo teks "Alhasan apps" (K-9): hanya di kepala Beranda. PNG transparan tiga
 * kerapatan turunan `docs/redesain-tampilan-v2/aset/Logo_alhasanApps.png`
 * (repo WebAlHasan) tanpa perubahan warna/bentuk. Tingginya tetap 28 pt dan
 * tidak ikut skala teks sistem.
 */
const LOGO = require('@/assets/images/brand/alhasan-apps.png');

export const TINGGI_LOGO = 28;
/** Rasio berkas sumber 2161 × 761. */
export const LEBAR_LOGO = Math.round((TINGGI_LOGO * 2161) / 761);

export function BrandLogo() {
  return (
    <Image
      source={LOGO}
      style={{ width: LEBAR_LOGO, height: TINGGI_LOGO }}
      contentFit="contain"
      accessible
      accessibilityRole="image"
      accessibilityLabel="Alhasan apps"
    />
  );
}
