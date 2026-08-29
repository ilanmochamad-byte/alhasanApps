import type { ReactNode } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { NotificationBell } from '@/components/notification-bell';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';

const LOGO_LIGHT = require('@/assets/images/Logo_alhasanApps.png');
const LOGO_DARK = require('@/assets/images/Logo_alhasanApps_dark.png');

/**
 * Bilah judul layar utama: judul besar di kiri, aksi di kanan, dan lonceng
 * notifikasi paling kanan.
 */
export function ScreenHeader({
  title,
  actions,
  bell = true,
}: {
  title: string;
  actions?: ReactNode;
  bell?: boolean;
}) {
  return (
    <View style={styles.row}>
      <ThemedText selectable type="h1" style={styles.title}>
        {title}
      </ThemedText>
      {actions}
      {bell ? <NotificationBell /> : null}
    </View>
  );
}

/** Varian Beranda: logo menggantikan judul teks. */
export function BrandHeader({ actions }: { actions?: ReactNode }) {
  const scheme = useColorScheme();
  const source = scheme === 'dark' ? LOGO_DARK : LOGO_LIGHT;
  return (
    <View style={styles.row}>
      <Image
        source={source}
        style={styles.logo}
        contentFit="contain"
        contentPosition="left center"
        accessibilityLabel="Alhasan Apps"
      />
      <View style={styles.spacer} />
      {actions}
      <NotificationBell />
    </View>
  );
}

/** Sapaan dan tanggal di bawah bilah judul Beranda. */
export function Greeting({ name, date }: { name: string; date: string }) {
  return (
    <View style={styles.greeting}>
      <ThemedText selectable type="overline" themeColor="textMuted">
        {date.toUpperCase()}
      </ThemedText>
      <ThemedText selectable style={styles.greetingName}>
        Assalamu&rsquo;alaikum, {name}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 10 },
  title: { flex: 1 },
  logo: { height: 30, width: 86 },
  spacer: { flex: 1 },
  greeting: { gap: 3, paddingBottom: 12 },
  greetingName: { fontSize: 21, lineHeight: 26, fontWeight: '800', letterSpacing: -0.2 },
});
