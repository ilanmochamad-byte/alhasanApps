import { StyleSheet, View, useWindowDimensions } from 'react-native';

import type { IzinStatus, Pengajuan } from '@/api/types';
import { AppIcon } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/chip';
import { EntityRow } from '@/components/ui/entity-row';
import { StatusPill, type StatusTone } from '@/components/ui/status-pill';
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

/** Nada pil status izin (gelombang 2): disetujui hijau, ditolak merah, batal netral, lainnya menunggu. */
export function statusPillTone(status: IzinStatus): StatusTone {
  switch (status) {
    case 'Disetujui':
      return 'success';
    case 'Ditolak':
      return 'danger';
    case 'Dibatalkan':
      return 'neutral';
    default:
      return 'warning';
  }
}

/** Pil status izin: ikon + teks status dari server. */
export function IzinStatusPill({ status }: { status: IzinStatus }) {
  return <StatusPill label={status} tone={statusPillTone(status)} icon={statusIcon(status)} />;
}

export function StatusBadge({ status }: { status: IzinStatus }) {
  return <Badge label={status} tone={statusTone(status)} />;
}

/** Ikon status izin; selalu berpasangan dengan teks status. */
export function statusIcon(status: IzinStatus) {
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
 * Baris pengajuan izin (redesain gelombang 2 §4.2, pola `EntityRow`): avatar
 * inisial, nama, NIS · nomor, rentang tanggal, alasan, pil status ikon + teks,
 * dan petunjuk tindakan. Keputusan selalu diambil di layar rincian karena
 * server mewajibkan alasan keputusan; baris hanya mengarahkan ke sana.
 */
export function IzinCard({ item, onPress }: { item: Pengajuan; onPress: () => void }) {
  const { fontScale } = useWindowDimensions();
  // Teks sistem sangat besar: keterangan pengurus/murobi dan petunjuk
  // tindakan ditumpuk agar keduanya tidak saling memeras.
  const bertumpuk = fontScale > 1.35;
  const hari = lamaHari(item.tgl_izin, item.tgl_kembali);

  // Petunjuk tindakan berasal dari `aksi` yang dihitung server, bukan tebakan
  // aplikasi. `aksi` dibaca dengan penjagaan opsional: bila muatan daftar tidak
  // menyertakannya, baris tetap tampil tanpa petunjuk tindakan.
  const tindakan = item.aksi?.tetapkan_murobi
    ? 'Tetapkan murobi'
    : item.aksi?.putuskan_murobi || item.aksi?.putuskan_admin
      ? 'Tinjau & putuskan'
      : null;

  return (
    <EntityRow
      avatarName={item.santri.nama}
      title={item.santri.nama}
      subtitle={`NIS ${item.santri.nis} · #${item.id}`}
      highlight={tindakan ? 'warning' : undefined}
      onPress={onPress}
      accessibilityLabel={[
        `Pengajuan ${item.id} untuk ${item.santri.nama}`,
        `status ${item.status}`,
        tindakan ? `perlu tindakan: ${tindakan}` : null,
      ]
        .filter(Boolean)
        .join(', ')}
      detail={
        <View style={styles.detail}>
          <View style={styles.range}>
            <AppIcon name="calendar" size={14} themeColor="textMuted" />
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
          <ThemedText selectable type="caption" themeColor="textSecondary">
            {item.pengurus_label ? `${item.pengurus_label} · ` : ''}
            {item.murobi_label ? `Murobi ${item.murobi_label}` : 'Murobi belum ditetapkan'}
          </ThemedText>
          {item.is_legacy ? (
            <ThemedText selectable type="caption" themeColor="warning">
              {item.sumber_label} — hanya dapat dibaca
            </ThemedText>
          ) : null}
        </View>
      }
      pill={
        <View style={[styles.pills, bertumpuk && styles.pillsStacked]}>
          <IzinStatusPill status={item.status} />
          {tindakan ? (
            <View style={styles.action}>
              <ThemedText selectable type="label" themeColor="primary">
                {tindakan}
              </ThemedText>
            </View>
          ) : null}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  detail: { gap: 4, paddingTop: 4 },
  range: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  rangeText: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  pills: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 10, rowGap: 4 },
  pillsStacked: { flexDirection: 'column', alignItems: 'flex-start' },
  action: { minHeight: 24, justifyContent: 'center' },
});
