import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { keuangan } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { tanggalPanjang, waktuPendek } from '@/components/kesehatan-shared';
import { BarisPil, Halaman, HalamanKeadaan, JudulBagian, Penomoran, Pesan, StatusBadge, TombolMuatUlang } from '@/components/keuangan-shared';
import { SetoranTransferKartu } from '@/components/keuangan-setoran';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { AvatarInisial } from '@/components/ui/avatar-inisial';
import { EntityRow } from '@/components/ui/entity-row';
import { ProfileHeader } from '@/components/ui/profile-header';
import { SegmentTabs } from '@/components/ui/segment-tabs';
import { StatusPill } from '@/components/ui/status-pill';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { labelJenis, labelPeriode, nominalBertanda, putaranArah, rupiah, sisaTagihanTerbuka } from '@/keuangan/forms';

const JUDUL = 'Keuangan santri';
type Bagian = 'ringkasan' | 'tagihan' | 'tabungan';

/**
 * Keuangan satu santri (pola P-Rincian): kepala profil dengan strip angka,
 * tagihan, riwayat tabungan, dan (internal) setoran transfer yang menunggu.
 * Tagihan dan tabungan ditampilkan terpisah; pembayaran dari tabungan tampil
 * di keduanya dengan nomor rujukan silang. Setiap fokus/kembali dari latar
 * meminta server lagi, sehingga relasi wali atau penugasan yang dicabut
 * menutup akses walau layar lama masih terbuka.
 */
export default function SantriKeuanganScreen() {
  const { profile } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Detail key={`${profile?.id}:${id}`} id={Number(id)} />;
}

function Detail({ id }: { id: number }) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [bagian, setBagian] = useState<Bagian>('ringkasan');
  const [pesan, setPesan] = useState<string | null>(null);
  const fetcher = useCallback(async () => {
    if (!Number.isSafeInteger(id) || id < 1) throw new Error('Penunjuk santri tidak valid.');
    return keuangan.santri(id, page);
  }, [id, page]);
  const { data: d, error, load, reject } = usePrivateResource(fetcher);
  if (error) return <HalamanKeadaan title={JUDUL}><ErrorState message={error} onRetry={() => void load()} /></HalamanKeadaan>;
  if (!d) return <HalamanKeadaan title={JUDUL}><LoadingState label="Memeriksa akses keuangan santri…" /></HalamanKeadaan>;
  const kelola = d.akses.kelola && d.santri.aktif;
  const internal = d.akses.sumber !== 'wali';
  const transaksi = (mode: 'setoran' | 'keluar') => router.push({ pathname: '/keuangan/transaksi', params: { santri_id: String(d.santri.id), mode } });
  const menunggu = d.setoran_transfer.filter(s => s.status === 'Menunggu');
  const sisa = sisaTagihanTerbuka(d.tagihan);
  const tampilTagihan = bagian !== 'tabungan';
  const tampilTabungan = bagian !== 'tagihan';
  return (
    <Halaman title={JUDUL} actions={<TombolMuatUlang onPress={() => { setPesan(null); void load(); }} />}>
      <ProfileHeader
        avatar={<AvatarInisial nama={d.santri.nama} ukuran={72} />}
        name={d.santri.nama}
        caption={`NIS ${d.santri.nis}${d.santri.kelas ? ` · ${d.santri.kelas}` : ''}${d.santri.unit ? ` · ${d.santri.unit}` : ''}`}
        pills={d.santri.aktif ? <StatusPill tone="success" label="Aktif" /> : <StatusPill tone="warning" icon="info" label="Santri tidak aktif" />}
        statsNominal
        stats={[
          { value: rupiah(d.saldo), label: 'Saldo tabungan' },
          { value: sisa === null ? '—' : rupiah(sisa), label: 'Sisa tagihan' },
          ...(internal ? [{ value: rupiah(d.saldo_menunggu), label: 'Transfer menunggu' }] : []),
        ]}>
        {kelola ? (
          <View style={styles.cepat}>
            <View style={styles.cepatBaris}>
              <AppButton label="Setoran" icon="plus" size="sm" onPress={() => transaksi('setoran')} style={styles.flex} />
              <AppButton label="Penarikan/belanja" size="sm" variant="secondary" onPress={() => transaksi('keluar')} style={styles.flex} />
            </View>
            <AppButton label="Terbitkan tagihan" size="sm" variant="line"
              onPress={() => router.push({ pathname: '/keuangan/terbit-santri', params: { santri_id: String(d.santri.id) } })} />
          </View>
        ) : null}
      </ProfileHeader>
      {internal && d.saldo_menunggu > 0 ? <Pesan tone="info" text="Transfer menunggu verifikasi belum dihitung dalam saldo." /> : null}
      {sisa === null ? <Pesan tone="info" text="Sisa tagihan tidak dijumlahkan karena daftar tagihan dibatasi server; lihat setiap tagihan atau menu Tunggakan." /> : null}
      <Pesan text={pesan} tone="success" />

      <SegmentTabs<Bagian> accessibilityLabel="Bagian keuangan santri" value={bagian} onChange={setBagian}
        tabs={[{ value: 'ringkasan', label: 'Ringkasan' }, { value: 'tagihan', label: 'Tagihan' }, { value: 'tabungan', label: 'Tabungan' }]} />

      {tampilTagihan ? (
        <>
          <JudulBagian title={`Tagihan bulanan (${d.tagihan.length})`} />
          {d.tagihan.length === 0 ? <EmptyState icon="wallet" title="Belum ada tagihan" message="Tagihan bulanan santri ini belum diterbitkan." /> : null}
          {d.tagihan.map(t => (
            <EntityRow key={t.id} icon="wallet" title={labelPeriode(t.periode)}
              subtitle={`Jatuh tempo ${tanggalPanjang(t.jatuh_tempo)}`}
              value={rupiah(t.sisa)} valueCaption="Sisa" valueTone={t.sisa > 0 ? 'warning' : 'text'}
              detail={<ThemedText selectable type="caption" themeColor="textSecondary">Total {rupiah(t.total)} · dibayar {rupiah(t.terbayar)}</ThemedText>}
              pill={<StatusBadge status={t.status_bayar} />}
              accessibilityLabel={`Buka tagihan ${labelPeriode(t.periode)}`}
              onPress={() => router.push({ pathname: '/keuangan/tagihan/[id]', params: { id: String(t.id) } })} />
          ))}
        </>
      ) : null}

      {tampilTabungan && internal && d.setoran_transfer.length > 0 ? (
        <>
          <JudulBagian title={`Setoran transfer (${menunggu.length} menunggu)`} />
          {d.setoran_transfer.map(s => (
            <SetoranTransferKartu onDenied={reject} key={s.id} s={s} kelola={kelola} onSelesai={p => { setPesan(p); void load(); }} />
          ))}
        </>
      ) : null}

      {tampilTabungan ? (
        <>
          <JudulBagian title={`Riwayat tabungan (${d.tabungan.total})`} />
          {d.tabungan.rows.length === 0 ? <EmptyState icon="wallet" title="Belum ada transaksi tabungan" message="Setoran, penarikan, dan belanja tampil di sini setelah dicatat Petugas BSA." /> : null}
          {d.tabungan.rows.map(x => (
            <EntityRow key={x.id} icon="arrow-right" iconRotate={putaranArah(x.arah)} tone={x.arah === 'Masuk' ? 'primary' : 'warning'}
              title={labelJenis(x.jenis)}
              subtitle={`${x.nomor_kuitansi} · ${x.metode} · ${waktuPendek(x.waktu)}`}
              value={nominalBertanda(x.arah, x.nominal)} valueTone={x.arah === 'Masuk' ? 'primary' : 'warning'}
              valueCaption={`Saldo ${rupiah(x.saldo_sesudah)}`}
              detail={x.tujuan ? <ThemedText selectable type="caption">{x.tujuan}</ThemedText> : undefined}
              pill={x.pembayaran || x.pembalik_dari || x.dikoreksi_oleh_id !== null ? (
                <BarisPil>
                  {x.pembayaran ? <StatusPill tone="info" icon="wallet" label={`Tagihan ${labelPeriode(x.pembayaran.periode)} · ${x.pembayaran.nomor_kuitansi}`} /> : null}
                  {x.pembalik_dari ? <StatusPill tone="warning" icon="refresh" label={`Koreksi ${x.pembalik_dari.nomor_kuitansi}`} /> : null}
                  {x.dikoreksi_oleh_id !== null ? <StatusPill tone="warning" icon="refresh" label="Sudah dikoreksi" /> : null}
                </BarisPil>
              ) : undefined}
              accessibilityLabel={`Buka transaksi ${x.nomor_kuitansi}`}
              onPress={() => router.push({ pathname: '/keuangan/tabungan/[id]', params: { id: String(x.id) } })} />
          ))}
          <Penomoran page={d.tabungan.page} total={d.tabungan.total} perPage={d.tabungan.per_page} onPage={setPage} />
        </>
      ) : null}
    </Halaman>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cepat: { alignSelf: 'stretch', gap: 10 },
  cepatBaris: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
