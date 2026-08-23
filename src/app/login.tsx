import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { actionableError } from '@/api/client';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { KeyboardAwareScrollView, KeyboardAwareTextInput } from '@/components/keyboard-aware-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export default function LoginScreen() {
  const theme = useTheme();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
    <KeyboardAwareScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: theme.background }} contentContainerStyle={styles.scrollContent}>
      <View style={styles.wrapper}>
        <View style={[styles.brand, { backgroundColor: theme.primary }]}><ThemedText selectable style={[styles.brandText, { color: theme.onPrimary }]}>AH</ThemedText></View>
        <View style={styles.intro}><ThemedText selectable style={styles.title}>Aplikasi Guru Al Hasan</ThemedText><ThemedText selectable themeColor="textSecondary" style={styles.subtitle}>Masuk untuk melihat jadwal dan mencatat absensi pengajian.</ThemedText></View>
        <View style={[styles.form, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.field}><ThemedText selectable type="smallBold">Username</ThemedText><KeyboardAwareTextInput autoCapitalize="none" autoCorrect={false} autoComplete="username" value={username} onChangeText={setUsername} placeholder="Masukkan username" placeholderTextColor={theme.textSecondary} style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]} /></View>
          <View style={styles.field}><ThemedText selectable type="smallBold">Password</ThemedText><KeyboardAwareTextInput autoCapitalize="none" autoCorrect={false} autoComplete="current-password" secureTextEntry value={password} onChangeText={setPassword} onSubmitEditing={() => void submit()} placeholder="Masukkan password" placeholderTextColor={theme.textSecondary} style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]} /></View>
          {error ? <ThemedText selectable themeColor="danger" accessibilityLiveRegion="assertive">{error}</ThemedText> : null}
          <AppButton label="Masuk" onPress={() => void submit()} loading={submitting} />
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  wrapper: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: 24 },
  brand: { width: 68, height: 68, borderRadius: 22, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  brandText: { fontSize: 26, fontWeight: '900' },
  intro: { gap: 8 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '900' },
  subtitle: { fontSize: 17, lineHeight: 24 },
  form: { borderWidth: 1, borderRadius: 22, borderCurve: 'continuous', padding: 20, gap: 18, boxShadow: '0 8px 30px rgba(18, 42, 25, 0.08)' },
  field: { gap: 7 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 13, borderCurve: 'continuous', paddingHorizontal: 14, fontSize: 16 },
});
