import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { keuangan } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Baris, Pesan, waktuPendek } from '@/components/kesehatan-shared';
import { Halaman, StatusBadge } from '@/components/keuangan-shared';
import { PrivateField } from '@/components/private-field';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Badge, ChipRow } from '@/components/ui/chip';
import { Panel } from '@/components/ui/surface';
import { useKeuanganMutation } from '@/hooks/use-keuangan-mutation';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { useNotifications } from '@/notifications/notification-context';
import { galatAlasan, labelJenis, labelPeriode, rupiah, sidikJari } from '@/keuangan/forms';

/**
 * Kuitansi satu transaksi tabungan — juga tujuan ketukan notifikasi
 * transaksi tabungan. Koreksi membuat baris pembalik beralasan di server;
 * transaksi asal tidak berubah. Debit pembayaran tagihan dikoreksi lewat
 * pembatalan pembayarannya.
 */
export default function TransaksiTabunganScreen() {
  const { profile } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Detail key={`${profile?.id}:${id}`} id={Number(id)} />;
}

function Detail({ id }: { id: number }) {
  const router = useRouter();
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
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!x) return <LoadingState label="Memeriksa akses transaksi…" />;
  const internal = x.akses.sumber !== 'wali';
  const bolehKoreksi = x.akses.kelola && x.santri.aktif && x.jenis !== 'Pembalik' && x.jenis !== 'PembayaranTagihan' && x.dikoreksi_oleh_id === null;
  async function simpan() {
    setPesan(null);
    const g = galatAlasan(alasan);
    if (g) { guard.setError(g); return; }
    const r = await guard.run(sidikJari('koreksi', id, alasan.trim()), key => keuangan.koreksi(id, alasan.trim(), key));
    if (r) { setPesan(`Koreksi ${r.nomor_kuitansi} tercatat. Saldo kini ${rupiah(r.saldo)}.`); setKoreksi(false); setAlasan(''); void load(); }
  }
  return (
    <Halaman>
      <Panel style={{ gap: 10 }}>
        <ThemedText type="h3">{x.nomor_kuitansi}</ThemedText>
        <ChipRow>
          <StatusBadge status={x.status} />
          {x.dikoreksi_oleh_id !== null ? <Badge label="Sudah dikoreksi" tone="warning" /> : null}
        </ChipRow>
        <Baris label="Santri" value={`${x.santri.nama} · NIS ${x.santri.nis}`} />
        <Baris label="Jenis" value={`${labelJenis(x.jenis)} (${x.arah === 'Masuk' ? 'masuk' : 'keluar'})`} />
        <Baris label="Nominal" value={rupiah(x.nominal)} />
        <Baris label="Cara" value={x.metode} />
        {x.tujuan ? <Baris label="Tujuan" value={x.tujuan} /> : null}
        <Baris label="Saldo sebelum" value={rupiah(x.saldo_sebelum)} />
        <Baris label="Saldo sesudah" value={rupiah(x.saldo_sesudah)} />
        {internal && x.referensi ? <Baris label="Referensi transfer" value={x.referensi} /> : null}
        {internal && x.catatan ? <Baris label="Catatan" value={x.catatan} /> : null}
        {internal && x.alasan ? <Baris label="Alasan koreksi" value={x.alasan} /> : null}
        <Baris label="Dicatat" value={`${x.petugas.nama}, ${waktuPendek(x.waktu)}`} />
        {x.penyetuju ? <Baris label="Disetujui" value={`${x.penyetuju.nama}${x.disetujui_pada ? `, ${waktuPendek(x.disetujui_pada)}` : ''}`} /> : null}
        {x.pembalik_dari ? <Baris label="Mengoreksi" value={`${x.pembalik_dari.nomor_kuitansi} (${labelJenis(x.pembalik_dari.jenis)})`} /> : null}
        {x.pembayaran ? <Baris label="Pembayaran tagihan" value={`${x.pembayaran.nomor_kuitansi} · ${labelPeriode(x.pembayaran.periode)} · ${x.pembayaran.status}`} /> : null}
      </Panel>
      <Pesan text={pesan} tone="success" />
      <Pesan text={guard.error} tone="danger" />
      {bolehKoreksi ? (
        koreksi ? (
          <Panel style={{ gap: 10 }}>
            <ThemedText>Koreksi mencatat transaksi pembalik {x.arah === 'Masuk' ? 'keluar' : 'masuk'} sebesar {rupiah(x.nominal)}. Transaksi asal tetap tersimpan.</ThemedText>
            <PrivateField label="Alasan koreksi (wajib)" value={alasan} onChangeText={setAlasan} multiline maxLength={500} editable={!guard.isBusy} />
            <AppButton label="Catat koreksi" variant="danger" loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void simpan()} />
            <AppButton label="Batal" variant="secondary" disabled={guard.isBusy} onPress={() => { setKoreksi(false); guard.reset(); }} />
          </Panel>
        ) : <AppButton label="Koreksi transaksi…" variant="outline" onPress={() => { setKoreksi(true); guard.reset(); }} />
      ) : null}
      {x.akses.kelola && x.jenis === 'PembayaranTagihan' && x.pembayaran ? (
        <ThemedText type="caption" themeColor="textSecondary">Debit pembayaran tagihan dikoreksi dengan membatalkan pembayaran {x.pembayaran.nomor_kuitansi}.</ThemedText>
      ) : null}
      {x.pembayaran ? <AppButton label="Buka kuitansi pembayaran" variant="secondary" onPress={() => router.push({ pathname: '/keuangan/pembayaran/[id]', params: { id: String(x.pembayaran!.id) } })} /> : null}
      {x.pembalik_dari ? <AppButton label="Buka transaksi asal" variant="secondary" onPress={() => router.push({ pathname: '/keuangan/tabungan/[id]', params: { id: String(x.pembalik_dari!.id) } })} /> : null}
      <AppButton label="Keuangan santri ini" variant="secondary" onPress={() => router.push({ pathname: '/keuangan/santri/[id]', params: { id: String(x.santri.id) } })} />
      <AppButton label="Muat ulang" variant="secondary" onPress={() => { setPesan(null); void load(); }} />
    </Halaman>
  );
}
