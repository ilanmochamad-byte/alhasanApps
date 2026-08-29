import { StyleSheet, View, useWindowDimensions } from 'react-native';

import type { IzinStatus, Pengajuan } from '@/api/types';
import { AppIcon } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/chip';
import { Card } from '@/components/ui/surface';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function formatTanggal(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Versi tanpa tahun, untuk sisi kiri rentang tanggal. */
function formatTanggalPendek(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

/** Lama izin dalam hari, inklusif. Dipakai hanya sebagai keterangan. */
function lamaHari(dari: string, sampai: string) {
  const a = new Date(`${dari}T00:00:00`);
  const b = new Date(`${sampai}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  const hari = Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
  return hari > 0 ? hari : null;
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

function statusTone(status: IzinStatus) {
  switch (status) {
    case 'Disetujui':
      return 'primary' as const;
    case 'Ditolak':
      return 'danger' as const;
    case 'Dibatalkan':
      return 'neutral' as const;
    default:
      return 'warning' as const;
  }
}

export function StatusBadge({ status }: { status: IzinStatus }) {
  return <Badge label={status} tone={statusTone(status)} />;
}

export function IzinCard({ item, onPress }: { item: Pengajuan; onPress: () => void }) {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const teksBesar = fontScale >= 1.6;
  const hari = lamaHari(item.tgl_izin, item.tgl_kembali);

  // Kartu antrean memberi tahu tindakan apa yang menunggu. Nilainya berasal
  // dari `aksi` yang dihitung server, bukan dari tebakan di sisi aplikasi.
  const tindakan = item.aksi.tetapkan_murobi
    ? 'Tetapkan murobi'
    : item.aksi.putuskan_murobi || item.aksi.putuskan_admin
      ? 'Perlu keputusan'
      : null;

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`Pengajuan ${item.id} untuk ${item.santri.nama}, status ${item.status}`}
      style={styles.card}>
      <View style={[styles.stripe, { backgroundColor: statusColor(item.status, theme) }]} />
      <View style={styles.body}>
        <View style={[styles.headerRow, teksBesar && styles.headerRowLarge]}>
          <View style={styles.identity}>
            <ThemedText selectable type="h3">
              {item.santri.nama}
            </ThemedText>
            <ThemedText selectable type="overline" themeColor="textMuted" style={styles.meta}>
              NIS {item.santri.nis} · #{item.id}
            </ThemedText>
          </View>
          <StatusBadge status={item.status} />
        </View>

        <View style={styles.range}>
          <ThemedText selectable style={styles.rangeText}>
            {formatTanggalPendek(item.tgl_izin)}
          </ThemedText>
          <AppIcon name="arrow-right" size={14} themeColor="textMuted" />
          <ThemedText selectable style={styles.rangeText}>
            {formatTanggal(item.tgl_kembali)}
          </ThemedText>
          {hari ? (
            <ThemedText selectable type="overline" themeColor="textMuted" style={styles.meta}>
              · {hari} hari
            </ThemedText>
          ) : null}
        </View>

        <ThemedText selectable type="caption" themeColor="textSecondary" numberOfLines={teksBesar ? undefined : 1}>
          {item.alasan}
        </ThemedText>

        <View style={[styles.footer, { borderTopColor: theme.divider }]}>
          <ThemedText selectable type="overline" themeColor="textMuted" style={[styles.meta, styles.footerText]}>
            {item.murobi_label ? `Murobi: ${item.murobi_label}` : 'Murobi belum ditetapkan'}
          </ThemedText>
          {tindakan ? (
            <ThemedText selectable type="caption" themeColor="primary" style={styles.action}>
              {tindakan}
            </ThemedText>
          ) : null}
        </View>

        {item.is_legacy ? (
          <ThemedText selectable type="caption" themeColor="warning">
            {item.sumber_label} — hanya dapat dibaca
          </ThemedText>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', padding: 0, overflow: 'hidden', gap: 0 },
  stripe: { width: 4, borderTopLeftRadius: Radius.xl, borderBottomLeftRadius: Radius.xl },
  body: { flex: 1, padding: 14, gap: 6 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  headerRowLarge: { flexDirection: 'column', alignItems: 'flex-start' },
  identity: { flex: 1, gap: 1 },
  meta: { letterSpacing: 0 },
  range: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  rangeText: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, marginTop: 2, paddingTop: 8 },
  footerText: { flex: 1 },
  action: { fontWeight: '800' },
});
