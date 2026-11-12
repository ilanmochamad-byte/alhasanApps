import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { keuangan } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { tanggalPanjang, waktuPendek } from '@/components/kesehatan-shared';
import { BarisPil, Halaman, HalamanKeadaan, Pesan, StatusBadge, TombolMuatUlang } from '@/components/keuangan-shared';
import { PrivateField } from '@/components/private-field';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Notice } from '@/components/ui/notice';
import { ReceiptCard, type ReceiptRow } from '@/components/ui/receipt-card';
import { SuccessPanel } from '@/components/ui/success-panel';
import { useKeuanganMutation } from '@/hooks/use-keuangan-mutation';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { useNotifications } from '@/notifications/notification-context';
import { galatAlasan, labelPeriode, rupiah, sidikJari } from '@/keuangan/forms';

const JUDUL = 'Kuitansi pembayaran';

/**
 * Kuitansi satu pembayaran (pola P-Sukses) — juga tujuan ketukan notifikasi
 * pembayaran. Angka kuitansi adalah snapshot saat sah dari server. Petugas
 * dapat memverifikasi transfer menunggu, atau membatalkan/menolak dengan
 * alasan di lembar bawah; pembatalan pembayaran dari tabungan mengembalikan
 * saldo di server. Cetak/PDF tetap dari website (keputusan T-1 V6).
 */
export default function PembayaranScreen() {
  const { profile } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Detail key={`${profile?.id}:${id}`} id={Number(id)} />;
}

function Detail({ id }: { id: number }) {
  const router = useRouter();
  const { tujuanDibuka } = useNotifications();
  const [batal, setBatal] = useState(false);
  const [alasan, setAlasan] = useState('');
  const [pesan, setPesan] = useState<string | null>(null);
  const fetcher = useCallback(async () => {
    if (!Number.isSafeInteger(id) || id < 1) throw new Error('Penunjuk pembayaran tidak valid.');
    const b = await keuangan.pembayaran(id);
    tujuanDibuka('bsa_pembayaran', id);
    return b;
  }, [id, tujuanDibuka]);
  const { data: b, error, load, reject } = usePrivateResource(fetcher, () => { setBatal(false); setAlasan(''); });
  const guard = useKeuanganMutation('bsa-putus-bayar', reject);
  if (error) return <HalamanKeadaan title={JUDUL}><ErrorState message={error} onRetry={() => void load()} /></HalamanKeadaan>;
  if (!b) return <HalamanKeadaan title={JUDUL}><LoadingState label="Memeriksa akses kuitansi…" /></HalamanKeadaan>;
  const kelola = b.akses.kelola && b.santri.aktif && b.status !== 'Dibatalkan';
  const internal = b.akses.sumber !== 'wali';
  const menunggu = b.status === 'Menunggu';
  async function putus(aksi: 'verifikasi' | 'batal') {
    setPesan(null);
    if (aksi === 'batal') { const g = galatAlasan(alasan); if (g) { guard.setError(g); return; } }
    const r = await guard.run(sidikJari(aksi, id, aksi === 'batal' ? alasan.trim() : ''), key => keuangan.putusPembayaran(id, aksi, alasan.trim(), key));
    if (r) {
      setPesan(aksi === 'verifikasi' ? `Pembayaran diverifikasi. Sisa tagihan ${rupiah(r.sisa)}.`
        : `Pembayaran ${r.status_pembayaran.toLowerCase()}. Sisa tagihan ${rupiah(r.sisa)}${r.saldo !== undefined ? `; saldo tabungan kembali ${rupiah(r.saldo)}` : ''}.`);
      setBatal(false); setAlasan(''); void load();
    }
  }
  const baris: ReceiptRow[] = [
    { label: 'No. kuitansi', value: b.nomor_kuitansi },
    { label: 'Santri', value: `${b.santri.nama} · NIS ${b.santri.nis}` },
    { label: 'Tagihan', value: labelPeriode(b.periode) },
    { label: 'Cara', value: b.sumber === 'Tabungan' ? 'Dari tabungan santri' : b.sumber },
    { label: 'Tanggal pembayaran', value: tanggalPanjang(b.tanggal_transaksi) },
    ...(b.tabungan ? [{ label: 'Debit tabungan', value: b.tabungan.nomor_kuitansi }] : []),
    ...(internal && b.referensi ? [{ label: 'Referensi transfer', value: b.referensi }] : []),
    ...(internal && b.catatan ? [{ label: 'Catatan', value: b.catatan }] : []),
    { label: 'Dicatat', value: `${b.pencatat.nama}, ${waktuPendek(b.dicatat_pada)}` },
    ...(b.verifikasi ? [{ label: 'Disahkan', value: `${b.verifikasi.oleh}, ${waktuPendek(b.verifikasi.pada)}` }] : []),
    ...(b.kuitansi ? [
      { label: `Total tagihan (versi ${b.kuitansi.tagihan_versi})`, value: rupiah(b.kuitansi.total_tagihan) },
      { label: 'Dibayar sebelumnya', value: rupiah(b.kuitansi.terbayar_sebelum) },
      { label: 'Pembayaran ini', value: rupiah(b.nominal) },
      { label: 'Sisa sesudah pembayaran', value: rupiah(b.kuitansi.sisa_sesudah), emphasis: true },
    ] : [{ label: 'Nominal', value: rupiah(b.nominal), emphasis: true }]),
  ];
  return (
    <Halaman title={JUDUL} actions={<TombolMuatUlang onPress={() => { setPesan(null); void load(); }} />}
      bawah={kelola ? (
        <View style={styles.bilah}>
          {menunggu ? <AppButton label="Dana sudah diperiksa — verifikasi" icon="check" loading={guard.isBusy && !batal} disabled={guard.isBusy} onPress={() => void putus('verifikasi')} /> : null}
          <AppButton label={menunggu ? 'Tolak transfer…' : 'Batalkan pembayaran…'} variant="outline" disabled={guard.isBusy}
            onPress={() => { setBatal(true); guard.reset(); }} />
        </View>
      ) : undefined}>
      {b.status === 'Sah' ? <SuccessPanel title="Pembayaran sah" message={`${rupiah(b.nominal)} untuk tagihan ${labelPeriode(b.periode)}.`} /> : null}
      {menunggu ? <SuccessPanel tone="menunggu" title="Menunggu verifikasi" message={`Transfer ${rupiah(b.nominal)} belum mengurangi sisa tagihan sampai dana diperiksa Petugas BSA.`} /> : null}
      {b.status === 'Dibatalkan' ? <Notice tone="danger" title="Pembayaran dibatalkan" text="Pembayaran ini tidak dihitung dalam tagihan." /> : null}
      <BarisPil><StatusBadge status={b.status} /></BarisPil>
      <ReceiptCard title={b.kuitansi ? 'Kuitansi (saat sah)' : 'Bukti pembayaran'} subtitle={b.nomor_kuitansi} rows={baris}
        footer="Cetak/PDF kuitansi tersedia di website BSA." />
      {b.pembatalan ? (
        <Notice tone="warning" title={b.pembatalan.jenis ?? 'Pembatalan'}>
          {b.pembatalan.oleh ? <ThemedText selectable type="caption">{b.pembatalan.oleh}, {waktuPendek(b.pembatalan.pada ?? null)}</ThemedText> : null}
          {internal && b.pembatalan.alasan ? <ThemedText type="caption">Alasan: {b.pembatalan.alasan}</ThemedText> : null}
          {b.tabungan?.pengembalian_id ? <ThemedText selectable type="caption">Saldo tabungan sudah dikembalikan.</ThemedText> : null}
        </Notice>
      ) : null}
      <Pesan text={pesan} tone="success" />
      {!batal ? <Pesan text={guard.error} tone="danger" /> : null}
      <View style={styles.tautan}>
        <AppButton label="Buka tagihan" variant="line" icon="wallet" onPress={() => router.push({ pathname: '/keuangan/tagihan/[id]', params: { id: String(b.tagihan_id) } })} />
        {b.tabungan ? <AppButton label="Buka debit tabungan" variant="line" icon="arrow-right" onPress={() => router.push({ pathname: '/keuangan/tabungan/[id]', params: { id: String(b.tabungan!.transaksi_id) } })} /> : null}
      </View>
      {kelola ? (
        <BottomSheet visible={batal} keyboardAware title={menunggu ? 'Tolak transfer' : 'Batalkan pembayaran'} onClose={() => { if (!guard.isBusy) { setBatal(false); guard.reset(); } }}>
          <Pesan tone="info" text={menunggu ? 'Transfer ditolak tidak mengurangi sisa tagihan.' : `Pembatalan mengembalikan ${rupiah(b.nominal)} ke sisa tagihan${b.sumber === 'Tabungan' ? ' dan ke saldo tabungan santri' : ''}.`} />
          <PrivateField label={menunggu ? 'Alasan penolakan (wajib)' : 'Alasan pembatalan (wajib)'} hint={`${alasan.trim().length}/500`} value={alasan} onChangeText={setAlasan} multiline maxLength={500} editable={!guard.isBusy} />
          <Pesan text={guard.error} tone="danger" />
          <AppButton label={menunggu ? 'Tolak transfer' : 'Batalkan pembayaran'} variant="danger" loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void putus('batal')} />
          <AppButton label="Batal" variant="secondary" disabled={guard.isBusy} onPress={() => { setBatal(false); guard.reset(); }} />
        </BottomSheet>
      ) : null}
    </Halaman>
  );
}

const styles = StyleSheet.create({
  bilah: { flex: 1, gap: 10 },
  tautan: { gap: 10 },
});
