import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { keuangan } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Pesan, tanggalPanjang, waktuPendek } from '@/components/kesehatan-shared';
import { Angka, Halaman, Penomoran, StatusBadge } from '@/components/keuangan-shared';
import { SetoranTransferKartu } from '@/components/keuangan-setoran';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Badge, ChipRow } from '@/components/ui/chip';
import { Card, Panel } from '@/components/ui/surface';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { labelJenis, labelPeriode, rupiah } from '@/keuangan/forms';

/**
 * Keuangan satu santri: saldo, tagihan, riwayat tabungan, dan (internal)
 * setoran transfer yang menunggu. Tagihan dan tabungan ditampilkan terpisah;
 * pembayaran dari tabungan tampil di keduanya dengan nomor rujukan silang.
 * Setiap fokus/kembali dari latar meminta server lagi, sehingga relasi wali
 * atau penugasan yang dicabut menutup akses walau layar lama masih terbuka.
 */
export default function SantriKeuanganScreen() {
  const { profile } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Detail key={`${profile?.id}:${id}`} id={Number(id)} />;
}

function Detail({ id }: { id: number }) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pesan, setPesan] = useState<string | null>(null);
  const fetcher = useCallback(async () => {
    if (!Number.isSafeInteger(id) || id < 1) throw new Error('Penunjuk santri tidak valid.');
    return keuangan.santri(id, page);
  }, [id, page]);
  const { data: d, error, load, reject } = usePrivateResource(fetcher);
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!d) return <LoadingState label="Memeriksa akses keuangan santri…" />;
  const kelola = d.akses.kelola && d.santri.aktif;
  const internal = d.akses.sumber !== 'wali';
  const transaksi = (mode: 'setoran' | 'keluar') => router.push({ pathname: '/keuangan/transaksi', params: { santri_id: String(d.santri.id), mode } });
  const menunggu = d.setoran_transfer.filter(s => s.status === 'Menunggu');
  return (
    <Halaman>
      <Panel style={{ gap: 10 }}>
        <ThemedText type="h3">{d.santri.nama}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">NIS {d.santri.nis}{d.santri.kelas ? ` · ${d.santri.kelas}` : ''}{d.santri.unit ? ` · ${d.santri.unit}` : ''}</ThemedText>
        {!d.santri.aktif ? <ChipRow><Badge label="Santri tidak aktif" tone="warning" /></ChipRow> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Angka label="Saldo tabungan" nilai={rupiah(d.saldo)} />
          {internal && d.saldo_menunggu > 0 ? <Angka label="Transfer menunggu verifikasi" nilai={rupiah(d.saldo_menunggu)} /> : null}
        </View>
        {internal && d.saldo_menunggu > 0 ? <ThemedText type="caption" themeColor="textSecondary">Transfer menunggu belum dihitung dalam saldo.</ThemedText> : null}
        {kelola ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <AppButton label="Setoran" icon="plus" size="sm" onPress={() => transaksi('setoran')} style={{ flex: 1 }} />
            <AppButton label="Penarikan/belanja" size="sm" variant="secondary" onPress={() => transaksi('keluar')} style={{ flex: 1 }} />
          </View>
        ) : null}
      </Panel>
      <Pesan text={pesan} tone="success" />

      <Panel style={{ gap: 10 }}>
        <ThemedText type="h3">Tagihan bulanan ({d.tagihan.length})</ThemedText>
        {d.tagihan.length === 0 ? <ThemedText themeColor="textSecondary">Belum ada tagihan.</ThemedText> : null}
        {d.tagihan.map(t => (
          <Card key={t.id} accessibilityLabel={`Buka tagihan ${labelPeriode(t.periode)}`} onPress={() => router.push({ pathname: '/keuangan/tagihan/[id]', params: { id: String(t.id) } })}>
            <View style={{ gap: 4 }}>
              <ThemedText type="bodyBold">{labelPeriode(t.periode)}</ThemedText>
              <ChipRow><StatusBadge status={t.status_bayar} /></ChipRow>
              <ThemedText>Total {rupiah(t.total)} · dibayar {rupiah(t.terbayar)} · sisa {rupiah(t.sisa)}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">Jatuh tempo {tanggalPanjang(t.jatuh_tempo)}</ThemedText>
            </View>
          </Card>
        ))}
      </Panel>

      {internal && d.setoran_transfer.length > 0 ? (
        <Panel style={{ gap: 10 }}>
          <ThemedText type="h3">Setoran transfer ({menunggu.length} menunggu)</ThemedText>
          {d.setoran_transfer.map(s => (
            <SetoranTransferKartu onDenied={reject} key={s.id} s={s} kelola={kelola} onSelesai={p => { setPesan(p); void load(); }} />
          ))}
        </Panel>
      ) : null}

      <Panel style={{ gap: 10 }}>
        <ThemedText type="h3">Riwayat tabungan ({d.tabungan.total})</ThemedText>
        {d.tabungan.rows.length === 0 ? <ThemedText themeColor="textSecondary">Belum ada transaksi tabungan.</ThemedText> : null}
        {d.tabungan.rows.map(x => (
          <Card key={x.id} accessibilityLabel={`Buka transaksi ${x.nomor_kuitansi}`} onPress={() => router.push({ pathname: '/keuangan/tabungan/[id]', params: { id: String(x.id) } })}>
            <View style={{ gap: 4 }}>
              <ThemedText type="bodyBold">{labelJenis(x.jenis)} · {x.arah === 'Masuk' ? '+' : '−'}{rupiah(x.nominal)}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">{x.nomor_kuitansi} · {x.metode} · {waktuPendek(x.waktu)}</ThemedText>
              {x.tujuan ? <ThemedText>{x.tujuan}</ThemedText> : null}
              <ThemedText>Saldo sesudah {rupiah(x.saldo_sesudah)}</ThemedText>
              <ChipRow>
                {x.pembayaran ? <Badge label={`Tagihan ${labelPeriode(x.pembayaran.periode)} · ${x.pembayaran.nomor_kuitansi}`} /> : null}
                {x.pembalik_dari ? <Badge label={`Koreksi ${x.pembalik_dari.nomor_kuitansi}`} tone="warning" /> : null}
                {x.dikoreksi_oleh_id !== null ? <Badge label="Sudah dikoreksi" tone="warning" /> : null}
              </ChipRow>
            </View>
          </Card>
        ))}
        <Penomoran page={d.tabungan.page} total={d.tabungan.total} perPage={d.tabungan.per_page} onPage={setPage} />
      </Panel>
      <AppButton label="Muat ulang" variant="secondary" onPress={() => { setPesan(null); void load(); }} />
    </Halaman>
  );
}
