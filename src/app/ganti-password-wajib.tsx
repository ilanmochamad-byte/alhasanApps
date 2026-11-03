import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { actionableError } from '@/api/client';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { GantiPasswordForm } from '@/components/ganti-password-form';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { Panel } from '@/components/ui/surface';
import { useTheme } from '@/hooks/use-theme';

/**
 * PRD-PROFIL-IMPORT PI-1: akun dengan password sementara dari admin masuk
 * dengan token terbatas. Layar ini satu-satunya yang tersedia sampai password
 * diganti; menu lain baru dimuat sesudah server menjadikan token penuh.
 */
export default function GantiPasswordWajibScreen() {
  const theme = useTheme();
  const { wajibGantiPassword, selesaiGantiPassword, logout } = useAuth();
  const [galatLanjut, setGalatLanjut] = useState<string | null>(null);

  async function lanjut() {
    setGalatLanjut(null);
    try {
      await selesaiGantiPassword();
    } catch (e) {
      // Password sudah berganti; pengguna dapat masuk ulang dengan password baru.
      setGalatLanjut(`Password berhasil diganti, tetapi menu belum dapat dimuat. ${actionableError(e)}`);
    }
  }

  function keluar() {
    if (process.env.EXPO_OS === 'web') { void logout(); return; }
    Alert.alert('Keluar tanpa mengganti password?', 'Anda tetap harus mengganti password sementara saat masuk lagi.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: () => void logout() },
    ]);
  }

  return (
    <KeyboardAwareScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <View style={styles.intro}>
        <ThemedText selectable type="display">Ganti password sementara</ThemedText>
        <ThemedText selectable themeColor="textSecondary">
          Admin menerbitkan password sementara untuk akun
          {wajibGantiPassword?.username ? ` @${wajibGantiPassword.username}` : ' ini'}. Buat password baru
          sebelum memakai aplikasi.
        </ThemedText>
      </View>
      <Panel>
        <GantiPasswordForm onBerhasil={lanjut} labelSimpan="Simpan dan lanjutkan" />
        {galatLanjut ? (
          <>
            <ThemedText selectable type="caption" themeColor="danger">{galatLanjut}</ThemedText>
            <AppButton label="Coba muat menu lagi" variant="secondary" onPress={() => void lanjut()} />
          </>
        ) : null}
      </Panel>
      <AppButton label="Keluar" variant="outline" icon="logout" onPress={keluar} />
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 20, width: '100%', maxWidth: 520, alignSelf: 'center' },
  intro: { gap: 8 },
});
