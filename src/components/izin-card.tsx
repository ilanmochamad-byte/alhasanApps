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

/** Ikon status izin; selalu berpasangan dengan teks status. */
function statusIcon(status: IzinStatus) {
  switch (status) {
    case 'Disetujui':
      return 'check' as const;
    case 'Ditolak':
    case 'Dibatalkan':
      return 'close' as const;
    default:
      return 'clock' as const;
  }
}

/** Dua huruf awal nama untuk avatar; kata yang diawali angka dilewati. */
export function inisial(nama: string) {
  const bagian = nama.trim().split(/\s+/).filter((kata) => /^\p{L}/u.test(kata));
  if (bagian.length === 0) return '?';
  return (bagian[0][0] + (bagian.length > 1 ? bagian[bagian.length - 1][0] : '')).toUpperCase();
}

/**
 * Kartu pengajuan izin (redesain tampilan Fase 2, gabungan A + C): avatar
 * inisial, nama, status berupa ikon + teks, rentang tanggal, alasan, dan
 * petunjuk tindakan. Keputusan selalu diambil di layar detail karena server
 * mewajibkan alasan keputusan; kartu hanya mengarahkan ke sana ("Tinjau").
 */
export function IzinCard({ item, onPress }: { item: Pengajuan; onPress: () => void }) {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  // Teks sistem sangat besar: keterangan pengurus/murobi dan petunjuk
  // tindakan ditumpuk agar keduanya tidak saling memeras.
  const bertumpuk = fontScale > 1.35;
  const hari = lamaHari(item.tgl_izin, item.tgl_kembali);
  const warna = statusColor(item.status, theme);

  // Kartu antrean memberi tahu tindakan apa yang menunggu. Nilainya berasal
  // dari `aksi` yang dihitung server, bukan dari tebakan di sisi aplikasi.
  // `aksi` dibaca dengan penjagaan opsional: bila suatu saat muatan daftar
  // tidak menyertakannya, kartu tetap tampil tanpa petunjuk tindakan alih-alih
  // menggagalkan seluruh daftar.
  const tindakan = item.aksi?.tetapkan_murobi
    ? 'Tetapkan murobi'
    : item.aksi?.putuskan_murobi || item.aksi?.putuskan_admin
      ? 'Tinjau & putuskan'
      : null;

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={[
        `Pengajuan ${item.id} untuk ${item.santri.nama}`,
        `status ${item.status}`,
        tindakan ? `perlu tindakan: ${tindakan}` : null,
      ]
        .filter(Boolean)
        .join(', ')}
      style={[styles.card, tindakan && { borderColor: theme.warningBorder }]}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
          <ThemedText style={[styles.avatarText, { color: theme.primary }]}>{inisial(item.santri.nama)}</ThemedText>
        </View>
        <View style={styles.identity}>
          <ThemedText selectable type="h3" style={styles.name}>
            {item.santri.nama}
          </ThemedText>
          <ThemedText selectable type="caption" themeColor="textSecondary">
            NIS {item.santri.nis} · #{item.id}
          </ThemedText>
        </View>
      </View>

      <View style={styles.statusRow}>
        <AppIcon name={statusIcon(item.status)} size={16} color={warna} />
        <ThemedText selectable style={[styles.statusText, { color: warna }]}>
          {item.status}
        </ThemedText>
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
          <ThemedText selectable type="caption" themeColor="textSecondary">
            · {hari} hari
          </ThemedText>
        ) : null}
      </View>

      <ThemedText selectable type="caption" themeColor="textSecondary" numberOfLines={2}>
        {item.alasan}
      </ThemedText>

      <View style={[styles.footer, bertumpuk && styles.footerStacked, { borderTopColor: theme.divider }]}>
        <ThemedText selectable type="caption" themeColor="textSecondary" style={styles.footerText}>
          {item.pengurus_label ? `${item.pengurus_label} · ` : ''}
          {item.murobi_label ? `Murobi ${item.murobi_label}` : 'Murobi belum ditetapkan'}
        </ThemedText>
        {tindakan ? (
          <View style={styles.action}>
            <ThemedText selectable style={[styles.actionText, { color: theme.primary }]}>
              {tindakan}
            </ThemedText>
            <AppIcon name="chevron-right" size={16} themeColor="primary" />
          </View>
        ) : null}
      </View>

      {item.is_legacy ? (
        <ThemedText selectable type="caption" themeColor="warning">
          {item.sumber_label} — hanya dapat dibaca
        </ThemedText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 15, lineHeight: 19, fontWeight: '800' },
  identity: { flex: 1, gap: 1 },
  name: { fontSize: 16, lineHeight: 21 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 13, lineHeight: 17, fontWeight: '800' },
  range: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  rangeText: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 8,
    rowGap: 4,
    borderTopWidth: 1,
    marginTop: 2,
    paddingTop: 8,
  },
  footerStacked: { flexDirection: 'column', alignItems: 'flex-start' },
  footerText: { flexGrow: 1, flexShrink: 1 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 24 },
  actionText: { fontSize: 13, lineHeight: 17, fontWeight: '800' },
});
