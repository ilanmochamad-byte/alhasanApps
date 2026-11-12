import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { GantiPasswordForm } from '@/components/ganti-password-form';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { SuccessPanel } from '@/components/ui/success-panel';
import { Panel } from '@/components/ui/surface';
import { Layout, Radius } from '@/constants/theme';
import { useKembali } from '@/hooks/use-kembali';
import { useTheme } from '@/hooks/use-theme';

/** Ganti password dari tab Profil (PRD-PROFIL-IMPORT Fase 2 §3). */
export default function GantiPasswordScreen() {
  const theme = useTheme();
  const kembali = useKembali('stack');
  const insets = useSafeAreaInsets();
  const [berhasil, setBerhasil] = useState(false);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Kepala di luar area gulir agar ← selalu terjangkau (K-10). */}
      <View style={[styles.kepalaLayar, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader variant="stack" title="Ganti password" />
      </View>
    <KeyboardAwareScrollView
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={styles.content}>
      {berhasil ? (
        <Panel>
          <SuccessPanel title="Password berhasil diganti" message="Gunakan password baru saat masuk berikutnya.">
            <AppButton label="Kembali ke Profil" onPress={kembali} />
          </SuccessPanel>
        </Panel>
      ) : (
        <>
          <View style={styles.kepala}>
            <View style={[styles.lingkaran, { backgroundColor: theme.primarySoft }]}>
              <AppIcon name="lock" size={30} themeColor="primary" />
            </View>
          </View>
          <View style={[styles.info, { backgroundColor: theme.infoSoft }]}>
            <AppIcon name="info" size={18} themeColor="info" />
            <ThemedText selectable type="caption" themeColor="info" style={styles.infoTeks}>
              Setelah password diganti, sesi di perangkat dan browser lain akan keluar. Sesi di perangkat ini tetap aktif.
            </ThemedText>
          </View>
          <Panel>
            <GantiPasswordForm onBerhasil={() => setBerhasil(true)} />
          </Panel>
        </>
      )}
      <ThemedText selectable type="caption" themeColor="textSecondary">
        Lupa password saat ini? Hubungi admin pesantren untuk menerbitkan password sementara.
      </ThemedText>
    </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  kepalaLayar: { paddingHorizontal: Layout.screen, paddingBottom: 4, width: '100%', maxWidth: 760, alignSelf: 'center' },
  content: { paddingHorizontal: Layout.screen, paddingTop: 8, gap: 16, paddingBottom: 48, width: '100%', maxWidth: 760, alignSelf: 'center' },
  kepala: { alignItems: 'center' },
  lingkaran: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  info: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: Radius.lg, borderCurve: 'continuous', padding: 14 },
  infoTeks: { flex: 1, fontWeight: '700' },
});
