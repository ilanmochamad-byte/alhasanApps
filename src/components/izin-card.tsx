import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { IzinStatus, Pengajuan } from '@/api/types';
import { useTheme } from '@/hooks/use-theme';

export function formatTanggal(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function statusColor(status: IzinStatus, theme: ReturnType<typeof useTheme>) {
  switch (status) {
    case 'Disetujui':
      return theme.success;
    case 'Ditolak':
      return theme.danger;
    case 'Perlu Penetapan Admin':
      return theme.warning;
    case 'Dibatalkan':
      return theme.textSecondary;
    default:
      return theme.primary;
  }
}

export function StatusBadge({ status }: { status: IzinStatus }) {
  const theme = useTheme();
  const color = statusColor(status, theme);
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <ThemedText selectable type="small" style={{ color, fontWeight: '700' }}>
        {status}
      </ThemedText>
    </View>
  );
}

export function IzinCard({ item, onPress }: { item: Pengajuan; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Pengajuan ${item.id} untuk ${item.santri.nama}, status ${item.status}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
      ]}>
      <View style={styles.headerRow}>
        <ThemedText selectable style={styles.title}>
          {item.santri.nama}
        </ThemedText>
        <StatusBadge status={item.status} />
      </View>
      <ThemedText selectable type="small" themeColor="textSecondary">
        NIS {item.santri.nis} · #{item.id}
      </ThemedText>
      <ThemedText selectable>
        {formatTanggal(item.tgl_izin)} → {formatTanggal(item.tgl_kembali)}
      </ThemedText>
      <ThemedText selectable type="small" themeColor="textSecondary" numberOfLines={2}>
        {item.alasan}
      </ThemedText>
      <View style={styles.metaRow}>
        <ThemedText selectable type="small" themeColor="textSecondary">
          Pengurus: {item.pengurus_label || '—'}
        </ThemedText>
        <ThemedText selectable type="small" themeColor="textSecondary">
          Murobi: {item.murobi_label || '—'}
        </ThemedText>
      </View>
      {item.is_legacy ? (
        <ThemedText selectable type="small" themeColor="warning">
          {item.sumber_label} — hanya dapat dibaca
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, borderCurve: 'continuous', padding: 16, gap: 5 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { fontSize: 17, fontWeight: '800', flexShrink: 1 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 4 },
});
