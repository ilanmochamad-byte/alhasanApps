import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppIcon, type IconName } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

/**
 * Keadaan layar (redesain gelombang 2): ikon besar dalam lingkaran krem di
 * atas judul. Teks dan perilaku tidak berubah.
 */
function Lingkaran({ icon, tone }: { icon: IconName; tone: 'netral' | 'bahaya' }) {
  const theme = useTheme();
  return (
    <View style={[styles.lingkaran, { backgroundColor: tone === 'bahaya' ? theme.dangerSoft : theme.backgroundElement }]}>
      <AppIcon name={icon} size={30} color={tone === 'bahaya' ? theme.danger : theme.textSecondary} />
    </View>
  );
}

export function LoadingState({ label = 'Memuat data…' }: { label?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <View style={[styles.lingkaran, { backgroundColor: theme.backgroundElement }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
      <ThemedText selectable themeColor="textSecondary" style={styles.message}>{label}</ThemedText>
    </View>
  );
}

export function EmptyState({ title, message, icon = 'info' }: { title: string; message: string; icon?: IconName }) {
  return (
    <View style={styles.container}>
      <Lingkaran icon={icon} tone="netral" />
      <ThemedText selectable style={styles.title}>{title}</ThemedText>
      <ThemedText selectable themeColor="textSecondary" style={styles.message}>{message}</ThemedText>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.container} accessibilityLiveRegion="assertive">
      <Lingkaran icon="refresh" tone="bahaya" />
      <ThemedText selectable themeColor="danger" style={styles.title}>Data belum dapat ditampilkan</ThemedText>
      <ThemedText selectable style={styles.message}>{message}</ThemedText>
      <View style={styles.button}><AppButton label="Coba lagi" onPress={onRetry} variant="secondary" /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 28, gap: 10, alignItems: 'center', justifyContent: 'center' },
  lingkaran: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { fontWeight: '800', fontSize: 17, textAlign: 'center' },
  message: { textAlign: 'center' },
  button: { minWidth: 150, paddingTop: 6 },
});
