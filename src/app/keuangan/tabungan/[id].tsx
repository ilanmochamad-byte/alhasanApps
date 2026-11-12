import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { keuangan } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { waktuPendek } from '@/components/kesehatan-shared';
import { BarisPil, Halaman, HalamanKeadaan, Pesan, StatusBadge, TombolMuatUlang } from '@/components/keuangan-shared';
import { PrivateField } from '@/components/private-field';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ReceiptCard, type ReceiptRow } from '@/components/ui/receipt-card';
import { StatusPill } from '@/components/ui/status-pill';
import { useKeuanganMutation } from '@/hooks/use-keuangan-mutation';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { useTheme } from '@/hooks/use-theme';
import { useNotifications } from '@/notifications/notification-context';
import { galatAlasan, labelJenis, labelPeriode, nominalBertanda, putaranArah, rupiah, sidikJari } from '@/keuangan/forms';

const JUDUL = 'Kuitansi tabungan';

/**
 * Kuitansi satu transaksi tabungan — juga tujuan ketukan notifikasi
 * transaksi tabungan. Koreksi membuat baris pembalik beralasan di server
 * (diisi di lembar bawah); transaksi asal tidak berubah. Debit pembayaran
 * tagihan dikoreksi lewat pembatalan pembayarannya.
 */
export default function TransaksiTabunganScreen() {
  const { profile } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Detail key={`${profile?.id}:${id}`} id={Number(id)} />;
}

function Detail({ id }: { id: number }) {
  const router = useRouter();
  const theme = useTheme();
  const { tujuanDibuka } = useNotifications();
  const [koreksi, setKoreksi] = useState(false);
  const [alasan, setAlasan] = useState('');
  const [pesan, setPesan] = useState<string | null>(null);
  const fetcher = useCallback(async () => {
    if (!Number.isSafeInteger(id) || id < 1) throw new Error('Penunjuk transaksi tidak valid.');
    const x = await keuangan.transaksi(id);
    tujuanDibuka('bsa_tabungan', id);
    return x;
  }, [id, tujuanDibuka]);
  const { data: x, error, load, reject } = usePrivateResource(fetcher, () => { setKoreksi(false); setAlasan(''); });
  const guard = useKeuanganMutation('bsa-koreksi', reject);
  if (error) return <HalamanKeadaan title={JUDUL}><ErrorState message={error} onRetry={() => void load()} /></HalamanKeadaan>;
  if (!x) return <HalamanKeadaan title={JUDUL}><LoadingState label="Memeriksa akses transaksi…" /></HalamanKeadaan>;
  const internal = x.akses.sumber !== 'wali';
  const masuk = x.arah === 'Masuk';
  const bolehKoreksi = x.akses.kelola && x.santri.aktif && x.jenis !== 'Pembalik' && x.jenis !== 'PembayaranTagihan' && x.dikoreksi_oleh_id === null;
  async function simpan() {
    setPesan(null);
    const g = galatAlasan(alasan);
    if (g) { guard.setError(g); return; }
    const r = await guard.run(sidikJari('koreksi', id, alasan.trim()), key => keuangan.koreksi(id, alasan.trim(), key));
    if (r) { setPesan(`Koreksi ${r.nomor_kuitansi} tercatat. Saldo kini ${rupiah(r.saldo)}.`); setKoreksi(false); setAlasan(''); void load(); }
  }
  const baris: ReceiptRow[] = [
    { label: 'No. kuitansi', value: x.nomor_kuitansi },
    { label: 'Santri', value: `${x.santri.nama} · NIS ${x.santri.nis}` },
    { label: 'Jenis', value: `${labelJenis(x.jenis)} (${masuk ? 'masuk' : 'keluar'})` },
    { label: 'Cara', value: x.metode },
    ...(x.tujuan ? [{ label: 'Tujuan', value: x.tujuan }] : []),
    { label: 'Nominal', value: nominalBertanda(x.arah, x.nominal) },
    { label: 'Saldo sebelum', value: rupiah(x.saldo_sebelum) },
    ...(internal && x.referensi ? [{ label: 'Referensi transfer', value: x.referensi }] : []),
    ...(internal && x.catatan ? [{ label: 'Catatan', value: x.catatan }] : []),
    ...(internal && x.alasan ? [{ label: 'Alasan koreksi', value: x.alasan }] : []),
    { label: 'Dicatat', value: `${x.petugas.nama}, ${waktuPendek(x.waktu)}` },
    ...(x.penyetuju ? [{ label: 'Disetujui', value: `${x.penyetuju.nama}${x.disetujui_pada ? `, ${waktuPendek(x.disetujui_pada)}` : ''}` }] : []),
    ...(x.pembalik_dari ? [{ label: 'Mengoreksi', value: `${x.pembalik_dari.nomor_kuitansi} (${labelJenis(x.pembalik_dari.jenis)})` }] : []),
    ...(x.pembayaran ? [{ label: 'Pembayaran tagihan', value: `${x.pembayaran.nomor_kuitansi} · ${labelPeriode(x.pembayaran.periode)} · ${x.pembayaran.status}` }] : []),
    { label: 'Saldo sesudah', value: rupiah(x.saldo_sesudah), emphasis: true },
  ];
  return (
    <Halaman title={JUDUL} actions={<TombolMuatUlang onPress={() => { setPesan(null); void load(); }} />}
      bawah={bolehKoreksi ? <AppButton label="Koreksi transaksi…" variant="outline" icon="refresh" onPress={() => { setKoreksi(true); guard.reset(); }} style={styles.flex} /> : undefined}>
      <View style={styles.kepala}>
        <View style={[styles.lingkaran, { backgroundColor: masuk ? theme.primarySoft : theme.warningSoft }]}>
          <AppIcon name="arrow-right" size={30} rotate={putaranArah(x.arah)} color={masuk ? theme.primary : theme.warning} />
        </View>
        <ThemedText selectable type="numeralLarge" themeColor={masuk ? 'primary' : 'warning'}>{nominalBertanda(x.arah, x.nominal)}</ThemedText>
        <ThemedText selectable themeColor="textSecondary">{`${labelJenis(x.jenis)} · ${masuk ? 'masuk' : 'keluar'}`}</ThemedText>
        <BarisPil>
          <StatusBadge status={x.status} />
          {x.dikoreksi_oleh_id !== null ? <StatusPill tone="warning" icon="refresh" label="Sudah dikoreksi" /> : null}
        </BarisPil>
      </View>
      <ReceiptCard title="Kuitansi tabungan" subtitle={x.nomor_kuitansi} rows={baris} footer="Cetak/PDF kuitansi tersedia di website BSA." />
      <Pesan text={pesan} tone="success" />
      {!koreksi ? <Pesan text={guard.error} tone="danger" /> : null}
      {x.akses.kelola && x.jenis === 'PembayaranTagihan' && x.pembayaran ? (
        <Pesan tone="info" text={`Debit pembayaran tagihan dikoreksi dengan membatalkan pembayaran ${x.pembayaran.nomor_kuitansi}.`} />
      ) : null}
      <View style={styles.tautan}>
        {x.pembayaran ? <AppButton label="Buka kuitansi pembayaran" variant="line" icon="check-circle" onPress={() => router.push({ pathname: '/keuangan/pembayaran/[id]', params: { id: String(x.pembayaran!.id) } })} /> : null}
        {x.pembalik_dari ? <AppButton label="Buka transaksi asal" variant="line" icon="arrow-right" onPress={() => router.push({ pathname: '/keuangan/tabungan/[id]', params: { id: String(x.pembalik_dari!.id) } })} /> : null}
        <AppButton label="Keuangan santri ini" variant="line" icon="person" onPress={() => router.push({ pathname: '/keuangan/santri/[id]', params: { id: String(x.santri.id) } })} />
      </View>
      {bolehKoreksi ? (
        <BottomSheet visible={koreksi} keyboardAware title="Koreksi transaksi" onClose={() => { if (!guard.isBusy) { setKoreksi(false); guard.reset(); } }}>
          <Pesan tone="info" text={`Koreksi mencatat transaksi pembalik ${masuk ? 'keluar' : 'masuk'} sebesar ${rupiah(x.nominal)}. Transaksi asal tetap tersimpan.`} />
          <PrivateField label="Alasan koreksi (wajib)" hint={`${alasan.trim().length}/500`} value={alasan} onChangeText={setAlasan} multiline maxLength={500} editable={!guard.isBusy} />
          <Pesan text={guard.error} tone="danger" />
          <AppButton label="Catat koreksi" variant="danger" loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void simpan()} />
          <AppButton label="Batal" variant="secondary" disabled={guard.isBusy} onPress={() => { setKoreksi(false); guard.reset(); }} />
        </BottomSheet>
      ) : null}
    </Halaman>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  kepala: { alignItems: 'center', gap: 6, paddingVertical: 8 },
  lingkaran: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  tautan: { gap: 10 },
});
