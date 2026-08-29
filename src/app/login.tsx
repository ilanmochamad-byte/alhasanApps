import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View, useColorScheme } from 'react-native';

import { actionableError } from '@/api/client';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { Field } from '@/components/ui/app-field';
import { AppIcon } from '@/components/app-icon';
import { Elevation, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const LOGO_LIGHT = require('@/assets/images/Logo_alhasanApps_potrait.png');
const LOGO_DARK = require('@/assets/images/Logo_alhasanApps_potrait_dark.png');

export default function LoginScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [lihatPassword, setLihatPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!username.trim() || !password) {
      setError('Username dan password wajib diisi.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await login(username.trim(), password);
    } catch (caught) {
      setError(actionableError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAwareScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.scrollContent}>
      <View style={styles.wrapper}>
        <View style={styles.brand}>
          <Image
            source={scheme === 'dark' ? LOGO_DARK : LOGO_LIGHT}
            style={styles.logo}
            contentFit="contain"
            accessibilityLabel="Alhasan Apps"
          />
          <View style={styles.intro}>
            <ThemedText selectable type="display" style={styles.title}>
              Masuk ke akun Anda
            </ThemedText>
            <ThemedText selectable type="body" themeColor="textSecondary" style={styles.subtitle}>
              Satu akun untuk jadwal mengajar, absensi pertemuan, dan perizinan santri.
            </ThemedText>
          </View>
        </View>

        <View style={[styles.form, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Field
            label="Username"
            icon="person"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            value={username}
            onChangeText={setUsername}
            placeholder="Masukkan username"
          />
          <Field
            label="Password"
            icon="lock"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            secureTextEntry={!lihatPassword}
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={() => void submit()}
            placeholder="Masukkan password"
            trailing={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={lihatPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                accessibilityState={{ checked: lihatPassword }}
                onPress={() => setLihatPassword((current) => !current)}
                hitSlop={10}>
                <AppIcon name="eye" size={19} themeColor={lihatPassword ? 'primary' : 'textMuted'} />
              </Pressable>
            }
          />
          {error ? (
            <ThemedText selectable type="caption" themeColor="danger" accessibilityLiveRegion="assertive">
              {error}
            </ThemedText>
          ) : null}
          <AppButton label="Masuk" onPress={() => void submit()} loading={submitting} />
        </View>

        <View style={styles.hint}>
          <AppIcon name="info" size={17} themeColor="textMuted" />
          <ThemedText selectable type="caption" themeColor="textSecondary" style={styles.hintText}>
            Lupa password? Hubungi admin pesantren untuk pengaturan ulang akun.
          </ThemedText>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  wrapper: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: 26 },
  brand: { alignItems: 'center', gap: 20 },
  logo: { width: 154, height: 202 },
  intro: { gap: 7, alignItems: 'center' },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center' },
  form: {
    borderWidth: 1,
    borderRadius: Radius.hero,
    borderCurve: 'continuous',
    padding: 20,
    gap: 16,
    boxShadow: Elevation.raised,
  },
  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 4 },
  hintText: { flex: 1 },
});
