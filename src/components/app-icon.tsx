import { Image } from 'expo-image';

import { useTheme } from '@/hooks/use-theme';
import type { ThemeColor } from '@/constants/theme';

/**
 * Ikon garis V2.
 *
 * Berkasnya adalah PNG hitam-transparan yang diwarnai ulang lewat `tintColor`
 * — pola yang sama dengan ikon tab lama, sehingga tidak ada dependensi native
 * baru yang perlu dipasang. Semua ikon digambar pada kisi 24 px dengan tebal
 * garis 1,8 px agar seragam.
 */
const ICONS = {
  home: require('@/assets/images/icons/home.png'),
  calendar: require('@/assets/images/icons/calendar.png'),
  izin: require('@/assets/images/icons/izin.png'),
  chart: require('@/assets/images/icons/chart.png'),
  person: require('@/assets/images/icons/person.png'),
  bell: require('@/assets/images/icons/bell.png'),
  'chevron-right': require('@/assets/images/icons/chevron-right.png'),
  'chevron-left': require('@/assets/images/icons/chevron-left.png'),
  'chevron-down': require('@/assets/images/icons/chevron-down.png'),
  'arrow-right': require('@/assets/images/icons/arrow-right.png'),
  search: require('@/assets/images/icons/search.png'),
  filter: require('@/assets/images/icons/filter.png'),
  plus: require('@/assets/images/icons/plus.png'),
  check: require('@/assets/images/icons/check.png'),
  close: require('@/assets/images/icons/close.png'),
  clock: require('@/assets/images/icons/clock.png'),
  printer: require('@/assets/images/icons/printer.png'),
  share: require('@/assets/images/icons/share.png'),
  logout: require('@/assets/images/icons/logout.png'),
  users: require('@/assets/images/icons/users.png'),
  device: require('@/assets/images/icons/device.png'),
  moon: require('@/assets/images/icons/moon.png'),
  info: require('@/assets/images/icons/info.png'),
  'text-size': require('@/assets/images/icons/text-size.png'),
  lock: require('@/assets/images/icons/lock.png'),
  eye: require('@/assets/images/icons/eye.png'),
  dots: require('@/assets/images/icons/dots.png'),
  book: require('@/assets/images/icons/book.png'),
  pin: require('@/assets/images/icons/pin.png'),
  refresh: require('@/assets/images/icons/refresh.png'),
} as const;

export type IconName = keyof typeof ICONS;

export function AppIcon({
  name,
  size = 20,
  color,
  themeColor = 'text',
}: {
  name: IconName;
  size?: number;
  /** Warna eksplisit; menang atas `themeColor`. */
  color?: string;
  themeColor?: ThemeColor;
}) {
  const theme = useTheme();
  return (
    <Image
      source={ICONS[name]}
      style={{ width: size, height: size }}
      tintColor={color ?? theme[themeColor]}
      contentFit="contain"
      accessible={false}
    />
  );
}
