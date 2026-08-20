import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export function LoadingState({ label = 'Memuat data…' }: { label?: string }) {
  const theme = useTheme();
  return <View style={styles.container} accessibilityLiveRegion="polite"><ActivityIndicator color={theme.primary} size="large" /><ThemedText selectable themeColor="textSecondary">{label}</ThemedText></View>;
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return <View style={styles.container}><ThemedText selectable style={styles.title}>{title}</ThemedText><ThemedText selectable themeColor="textSecondary" style={styles.message}>{message}</ThemedText></View>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <View style={styles.container} accessibilityLiveRegion="assertive"><ThemedText selectable themeColor="danger" style={styles.title}>Data belum dapat ditampilkan</ThemedText><ThemedText selectable style={styles.message}>{message}</ThemedText><View style={styles.button}><AppButton label="Coba lagi" onPress={onRetry} variant="secondary" /></View></View>;
}

const styles = StyleSheet.create({
  container: { padding: 28, gap: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '800', fontSize: 17, textAlign: 'center' },
  message: { textAlign: 'center' },
  button: { minWidth: 150, paddingTop: 6 },
});
