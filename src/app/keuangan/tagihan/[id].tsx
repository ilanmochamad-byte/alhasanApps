import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { keuangan } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { tanggalPanjang, waktuPendek } from '@/components/kesehatan-shared';
import { BarisPil, Halaman, HalamanKeadaan, JudulBagian, Kartu, Pesan, StatusBadge, TombolMuatUlang } from '@/components/keuangan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { EntityRow } from '@/components/ui/entity-row';
import { StatusPill } from '@/components/ui/status-pill';
import { Elevation, Radius } from '@/constants/theme';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { useTheme } from '@/hooks/use-theme';
import { useNotifications } from '@/notifications/notification-context';
import { labelPeriode, rupiah } from '@/keuangan/forms';

const JUDUL = 'Rincian tagihan';

/**
 * Rincian satu tagihan bergaya invoice — juga tujuan ketukan notifikasi
 * "Tagihan bulanan". ID dari notifikasi hanya penunjuk: server memeriksa
 * ulang relasi wali, penugasan, dan cakupan setiap kali layar dibuka atau
 * kembali aktif. Dibuka tanpa riwayat, ← membawa ke Beranda (K-10).
 */
export default function TagihanScreen() {
  const { profile } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Detail key={`${profile?.id}:${id}`} id={Number(id)} />;
}

/** Baris tabel invoice: keterangan di kiri, nominal di kanan. */
function BarisInvoice({ label, nilai, catatan, tebal, sorot }: { label: string; nilai: string; catatan?: string; tebal?: boolean; sorot?: 'danger' | 'success' }) {
  const theme = useTheme();
  return (
    <View style={[styles.baris, sorot ? { backgroundColor: sorot === 'danger' ? theme.dangerSoft : theme.primarySoft, borderRadius: Radius.md, paddingHorizontal: 10 } : null]}
      accessible accessibilityLabel={`${label}: ${nilai}`}>
      <View style={styles.flex}>
        <ThemedText selectable type={tebal ? 'bodyBold' : 'body'}>{label}</ThemedText>
        {catatan ? <ThemedText selectable type="caption" themeColor="textSecondary">{catatan}</ThemedText> : null}
      </View>
      <ThemedText selectable type={tebal ? 'bodyBold' : 'body'} themeColor={sorot ?? 'text'} style={styles.nominal}>{nilai}</ThemedText>
    </View>
  );
}

function Detail({ id }: { id: number }) {
  const router = useRouter();
  const theme = useTheme();
  const { tujuanDibuka } = useNotifications();
  const fetcher = useCallback(async () => {
    if (!Number.isSafeInteger(id) || id < 1) throw new Error('Penunjuk tagihan tidak valid.');
    const t = await keuangan.tagihan(id);
    tujuanDibuka('bsa_tagihan', id);
    return t;
  }, [id, tujuanDibuka]);
  const { data: t, error, load } = usePrivateResource(fetcher);
  if (error) return <HalamanKeadaan title={JUDUL}><ErrorState message={error} onRetry={() => void load()} /></HalamanKeadaan>;
  if (!t) return <HalamanKeadaan title={JUDUL}><LoadingState label="Memeriksa akses tagihan…" /></HalamanKeadaan>;
  const kelola = t.akses.kelola && t.santri.aktif && t.status === 'Terbit';
  const internal = t.akses.sumber !== 'wali';
  const habis = t.sisa - t.menunggu <= 0;
  const ke = (pathname: '/keuangan/bayar' | '/keuangan/bayar-tabungan' | '/keuangan/ubah-tagihan') =>
    router.push({ pathname, params: { tagihan_id: String(t.id) } });
  const keSantri = () => router.push({ pathname: '/keuangan/santri/[id]', params: { id: String(t.santri.id) } });
  return (
    <Halaman title={JUDUL} actions={<TombolMuatUlang onPress={() => void load()} />}
      // §4.9 (TL-11): satu tindakan utama di bilah; "Bayar dari tabungan" di ⋯
      // bersama revisi/batal (hanya ditawarkan selama masih ada sisa).
      menu={kelola ? [
        ...(habis ? [] : [{ label: 'Bayar dari tabungan', icon: 'wallet' as const, onPress: () => ke('/keuangan/bayar-tabungan') }]),
        { label: 'Revisi atau batalkan tagihan', icon: 'refresh', onPress: () => ke('/keuangan/ubah-tagihan') },
        { label: 'Keuangan santri ini', icon: 'person', onPress: keSantri },
      ] : undefined}
      bawah={kelola ? (
        <View style={styles.bilah}>
          <AppButton label="Catat pembayaran tunai/transfer" icon="plus" disabled={habis} onPress={() => ke('/keuangan/bayar')} />
        </View>
      ) : undefined}>
      <View style={[styles.invoice, { backgroundColor: theme.card, borderColor: theme.border, boxShadow: Elevation.card }]}>
        <View style={styles.kop}>
          <ThemedText selectable type="overline" themeColor="primary">PESANTREN AL HASAN · BSA</ThemedText>
          <ThemedText selectable type="h1">{`Tagihan ${labelPeriode(t.periode)}`}</ThemedText>
          <BarisPil>
            <StatusBadge status={t.status_bayar} />
            {t.versi > 1 ? <StatusPill tone="neutral" icon="refresh" label={`Versi ${t.versi}`} /> : null}
          </BarisPil>
        </View>
        <View style={styles.info}>
          <ThemedText selectable type="caption" themeColor="textSecondary">Untuk</ThemedText>
          <ThemedText selectable type="bodyBold">{`${t.santri.nama} · NIS ${t.santri.nis}`}</ThemedText>
          <ThemedText selectable type="caption" themeColor="textSecondary">{`Jatuh tempo ${tanggalPanjang(t.jatuh_tempo)}`}</ThemedText>
        </View>
        <View style={[styles.putus, { borderColor: theme.border }]} />
        <View style={styles.tabelKepala}>
          <ThemedText selectable type="h3" accessibilityRole="header" style={styles.flex}>Rincian biaya</ThemedText>
          <ThemedText type="labelSmall" themeColor="textSecondary">Nominal</ThemedText>
        </View>
        {t.komponen.map(k => <BarisInvoice key={`k${k.urutan}`} label={k.nama} nilai={rupiah(k.nominal)} />)}
        {t.penyesuaian.map((p, i) => (
          <BarisInvoice key={`p${i}`} label={`${p.jenis} · ${p.nama}${p.versi > 1 ? ` (revisi v${p.versi})` : ''}`}
            catatan={internal && p.alasan ? p.alasan : undefined}
            nilai={`${p.jenis === 'Potongan' ? '−' : '+'}${rupiah(p.nominal)}`} />
        ))}
        <View style={[styles.putus, { borderColor: theme.border }]} />
        <BarisInvoice label="Total tagihan" nilai={rupiah(t.total)} tebal />
        <BarisInvoice label="Dibayar" nilai={rupiah(t.terbayar)} />
        <BarisInvoice label="Sisa" nilai={rupiah(t.sisa)} tebal sorot={t.sisa > 0 ? 'danger' : 'success'} />
        {internal && t.menunggu > 0 ? (
          <BarisPil><StatusPill tone="warning" icon="clock" label={`Transfer menunggu verifikasi ${rupiah(t.menunggu)} (belum mengurangi sisa)`} /></BarisPil>
        ) : null}
        <ThemedText selectable type="caption" themeColor="textSecondary">Diterbitkan {t.penerbit.nama}, {waktuPendek(t.diterbitkan_pada)}.</ThemedText>
      </View>
      {kelola && habis ? <Pesan tone="info" text="Sisa tagihan sudah tertutup pembayaran (termasuk transfer yang menunggu verifikasi)." /> : null}

      <JudulBagian title={`Pembayaran (${t.pembayaran.length})`} />
      {t.pembayaran.length === 0 ? <EmptyState icon="wallet" title="Belum ada pembayaran" message="Pembayaran tunai, transfer, atau dari tabungan tampil di sini." /> : null}
      {t.pembayaran.map(b => (
        <EntityRow key={b.id} icon={b.status === 'Menunggu' ? 'clock' : b.status === 'Dibatalkan' ? 'close' : 'check-circle'} tone={b.status === 'Menunggu' ? 'warning' : b.status === 'Dibatalkan' ? 'danger' : 'primary'}
          title={b.sumber === 'Tabungan' ? 'Dari tabungan' : b.sumber}
          subtitle={`${b.nomor_kuitansi} · ${tanggalPanjang(b.tanggal_transaksi)}`}
          value={rupiah(b.nominal)}
          pill={<BarisPil><StatusBadge status={b.status} />{b.tabungan ? <StatusPill tone="info" icon="wallet" label={`Debit ${b.tabungan.nomor_kuitansi}`} /> : null}</BarisPil>}
          accessibilityLabel={`Buka kuitansi ${b.nomor_kuitansi}`}
          onPress={() => router.push({ pathname: '/keuangan/pembayaran/[id]', params: { id: String(b.id) } })} />
      ))}

      {internal && t.riwayat.length > 0 ? (
        <>
          <JudulBagian title="Riwayat versi" />
          <Kartu gap={10}>
            {t.riwayat.map(r => (
              <View key={r.versi} style={{ gap: 2 }}>
                <ThemedText selectable type="bodyBold">v{r.versi} · {r.tindakan} · {rupiah(r.total)}</ThemedText>
                <ThemedText selectable type="caption" themeColor="textSecondary">{r.aktor.nama}, {waktuPendek(r.waktu)} · jatuh tempo {tanggalPanjang(r.jatuh_tempo)}</ThemedText>
                {r.alasan ? <ThemedText selectable type="caption">Alasan: {r.alasan}</ThemedText> : null}
              </View>
            ))}
          </Kartu>
        </>
      ) : null}
      {!kelola ? <AppButton label="Keuangan santri ini" variant="line" icon="person" onPress={keSantri} /> : null}
    </Halaman>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bilah: { flex: 1, gap: 10 },
  invoice: { borderWidth: 1, borderRadius: Radius.xxl, borderCurve: 'continuous', padding: 18, gap: 12 },
  kop: { gap: 6 },
  info: { gap: 2 },
  putus: { borderTopWidth: 1.5, borderStyle: 'dashed' },
  tabelKepala: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  baris: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 6, minHeight: 32 },
  nominal: { textAlign: 'right', fontVariant: ['tabular-nums'] },
});
