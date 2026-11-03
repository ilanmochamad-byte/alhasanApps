import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { AppButton } from '@/components/app-button';
import { GantiPasswordForm } from '@/components/ganti-password-form';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { Panel } from '@/components/ui/surface';
import { useTheme } from '@/hooks/use-theme';

/** Ganti password dari tab Profil (PRD-PROFIL-IMPORT Fase 2 §3). */
export default function GantiPasswordScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [berhasil, setBerhasil] = useState(false);

  return (
    <KeyboardAwareScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <ThemedText selectable themeColor="textSecondary">
        Setelah password diganti, sesi di perangkat dan browser lain akan keluar. Sesi di perangkat ini tetap aktif.
      </ThemedText>
      {berhasil ? (
        <Panel>
          <ThemedText selectable type="h3" themeColor="primary" accessibilityLiveRegion="polite">Password berhasil diganti</ThemedText>
          <ThemedText selectable themeColor="textSecondary">Gunakan password baru saat masuk berikutnya.</ThemedText>
          <AppButton label="Kembali ke Profil" onPress={() => router.back()} />
        </Panel>
      ) : (
        <Panel>
          <GantiPasswordForm onBerhasil={() => setBerhasil(true)} />
        </Panel>
      )}
      <ThemedText selectable type="caption" themeColor="textMuted">
        Lupa password saat ini? Hubungi admin pesantren untuk menerbitkan password sementara.
      </ThemedText>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 48, width: '100%', maxWidth: 760, alignSelf: 'center' },
});
