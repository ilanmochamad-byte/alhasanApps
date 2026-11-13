import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { useAuth } from '@/auth/auth-context';
import { MaxContentWidth, Spacing } from '@/constants/theme';

/**
 * Versi web dari navigasi utama. Sama seperti versi native, menu perizinan
 * hanya muncul bila server melaporkan capability perizinan pada profil.
 */
export default function AppTabs() {
  const { profile, capabilities } = useAuth();
  const roles = profile?.roles ?? [];
  const aksesJadwal = roles.includes('guru') || roles.includes('admin');
  const adaPerizinan = capabilities.list.length > 0;

  return (
    <Tabs style={styles.root}>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>Beranda</TabButton>
          </TabTrigger>
          {aksesJadwal ? (
            <TabTrigger name="schedules" href="/schedules" asChild>
              <TabButton>Jadwal</TabButton>
            </TabTrigger>
          ) : null}
          {adaPerizinan ? (
            <TabTrigger name="izin" href="/perizinan" asChild>
              <TabButton>Izin</TabButton>
            </TabTrigger>
          ) : null}
          {/* Redesain tampilan: Laporan bukan tab lagi; dibuka dari ubin Beranda. */}
          {/* V2: tab Profil menampung identitas, cakupan, perangkat, dan
              tombol Keluar. Pusat notifikasi tidak lagi menjadi tab — ia
              dibuka lewat lonceng di bilah judul, sama seperti versi native. */}
          <TabTrigger name="profil" href="/profil" asChild>
            <TabButton>Profil</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        <ThemedText type="small" style={styles.label} themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} testID="bilah-tab-web" style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  slot: { flex: 1, minHeight: 0 },
  tabListContainer: {
    width: '100%',
    padding: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    flexShrink: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  tabButton: { flex: 1, minWidth: 44 },
  label: { textAlign: 'center' },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.one,
    borderRadius: Spacing.three,
  },
});
