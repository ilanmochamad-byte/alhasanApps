import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { keuangan } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Baris, tanggalPanjang, waktuPendek } from '@/components/kesehatan-shared';
import { Angka, Halaman, StatusBadge } from '@/components/keuangan-shared';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Badge, ChipRow } from '@/components/ui/chip';
import { Card, Divider, Panel } from '@/components/ui/surface';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { useNotifications } from '@/notifications/notification-context';
import { labelPeriode, rupiah } from '@/keuangan/forms';

/**
 * Rincian satu tagihan — juga tujuan ketukan notifikasi "Tagihan bulanan".
 * ID dari notifikasi hanya penunjuk: server memeriksa ulang relasi wali,
 * penugasan, dan cakupan setiap kali layar dibuka atau kembali aktif.
 */
export default function TagihanScreen() {
  const { profile } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Detail key={`${profile?.id}:${id}`} id={Number(id)} />;
}

function Detail({ id }: { id: number }) {
  const router = useRouter();
  const { tujuanDibuka } = useNotifications();
  const fetcher = useCallback(async () => {
    if (!Number.isSafeInteger(id) || id < 1) throw new Error('Penunjuk tagihan tidak valid.');
    const t = await keuangan.tagihan(id);
    tujuanDibuka('bsa_tagihan', id);
    return t;
  }, [id, tujuanDibuka]);
  const { data: t, error, load } = usePrivateResource(fetcher);
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!t) return <LoadingState label="Memeriksa akses tagihan…" />;
  const kelola = t.akses.kelola && t.santri.aktif && t.status === 'Terbit';
  const internal = t.akses.sumber !== 'wali';
  const ke = (pathname: '/keuangan/bayar' | '/keuangan/bayar-tabungan' | '/keuangan/ubah-tagihan') =>
    router.push({ pathname, params: { tagihan_id: String(t.id) } });
  return (
    <Halaman>
      <Panel style={{ gap: 10 }}>
        <ThemedText type="h3">Tagihan {labelPeriode(t.periode)}</ThemedText>
        <ChipRow><StatusBadge status={t.status_bayar} />{t.versi > 1 ? <Badge label={`Versi ${t.versi}`} /> : null}</ChipRow>
        <Baris label="Santri" value={`${t.santri.nama} · NIS ${t.santri.nis}`} />
        <Baris label="Jatuh tempo" value={tanggalPanjang(t.jatuh_tempo)} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Angka label="Total" nilai={rupiah(t.total)} />
          <Angka label="Dibayar" nilai={rupiah(t.terbayar)} />
          <Angka label="Sisa" nilai={rupiah(t.sisa)} tone={t.sisa > 0 ? 'danger' : 'success'} />
        </View>
        {internal && t.menunggu > 0 ? <ThemedText type="caption" themeColor="textSecondary">Transfer menunggu verifikasi {rupiah(t.menunggu)} (belum mengurangi sisa).</ThemedText> : null}
      </Panel>

      <Panel style={{ gap: 8 }}>
        <ThemedText type="h3">Rincian biaya</ThemedText>
        {t.komponen.map(k => <Baris key={`k${k.urutan}`} label={k.nama} value={rupiah(k.nominal)} />)}
        {t.penyesuaian.map((p, i) => (
          <Baris key={`p${i}`} label={`${p.jenis} · ${p.nama}${p.versi > 1 ? ` (revisi v${p.versi})` : ''}`} value={`${p.jenis === 'Potongan' ? '−' : '+'}${rupiah(p.nominal)}${internal && p.alasan ? ` — ${p.alasan}` : ''}`} />
        ))}
        <Divider />
        <Baris label="Total tagihan" value={rupiah(t.total)} />
      </Panel>

      <Panel style={{ gap: 10 }}>
        <ThemedText type="h3">Pembayaran ({t.pembayaran.length})</ThemedText>
        {t.pembayaran.length === 0 ? <ThemedText themeColor="textSecondary">Belum ada pembayaran.</ThemedText> : null}
        {t.pembayaran.map(b => (
          <Card key={b.id} accessibilityLabel={`Buka kuitansi ${b.nomor_kuitansi}`} onPress={() => router.push({ pathname: '/keuangan/pembayaran/[id]', params: { id: String(b.id) } })}>
            <View style={{ gap: 4 }}>
              <ThemedText type="bodyBold">{rupiah(b.nominal)} · {b.sumber === 'Tabungan' ? 'Dari tabungan' : b.sumber}</ThemedText>
              <ChipRow><StatusBadge status={b.status} />{b.tabungan ? <Badge label={`Debit ${b.tabungan.nomor_kuitansi}`} /> : null}</ChipRow>
              <ThemedText type="caption" themeColor="textSecondary">{b.nomor_kuitansi} · {tanggalPanjang(b.tanggal_transaksi)}</ThemedText>
            </View>
          </Card>
        ))}
      </Panel>

      {kelola ? (
        <Panel style={{ gap: 10 }}>
          <AppButton label="Catat pembayaran tunai/transfer" icon="plus" disabled={t.sisa - t.menunggu <= 0} onPress={() => ke('/keuangan/bayar')} />
          <AppButton label="Bayar dari tabungan" variant="secondary" disabled={t.sisa - t.menunggu <= 0} onPress={() => ke('/keuangan/bayar-tabungan')} />
          <AppButton label="Revisi atau batalkan tagihan" variant="secondary" onPress={() => ke('/keuangan/ubah-tagihan')} />
        </Panel>
      ) : null}

      {internal && t.riwayat.length > 0 ? (
        <Panel style={{ gap: 8 }}>
          <ThemedText type="h3">Riwayat versi</ThemedText>
          {t.riwayat.map(r => (
            <View key={r.versi} style={{ gap: 2 }}>
              <ThemedText type="bodyBold">v{r.versi} · {r.tindakan} · {rupiah(r.total)}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">{r.aktor.nama}, {waktuPendek(r.waktu)} · jatuh tempo {tanggalPanjang(r.jatuh_tempo)}</ThemedText>
              {r.alasan ? <ThemedText type="caption">Alasan: {r.alasan}</ThemedText> : null}
            </View>
          ))}
        </Panel>
      ) : null}
      <ThemedText type="caption" themeColor="textSecondary">Diterbitkan {t.penerbit.nama}, {waktuPendek(t.diterbitkan_pada)}.</ThemedText>
      <AppButton label="Keuangan santri ini" variant="secondary" onPress={() => router.push({ pathname: '/keuangan/santri/[id]', params: { id: String(t.santri.id) } })} />
      <AppButton label="Muat ulang" variant="secondary" onPress={() => void load()} />
    </Halaman>
  );
}
