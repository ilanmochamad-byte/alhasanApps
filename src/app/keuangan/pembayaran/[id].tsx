import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { keuangan } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Baris, Pesan, tanggalPanjang, waktuPendek } from '@/components/kesehatan-shared';
import { Halaman, StatusBadge } from '@/components/keuangan-shared';
import { PrivateField } from '@/components/private-field';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { ChipRow } from '@/components/ui/chip';
import { Panel } from '@/components/ui/surface';
import { useKeuanganMutation } from '@/hooks/use-keuangan-mutation';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { useNotifications } from '@/notifications/notification-context';
import { galatAlasan, labelPeriode, rupiah, sidikJari } from '@/keuangan/forms';

/**
 * Kuitansi satu pembayaran — juga tujuan ketukan notifikasi pembayaran.
 * Angka kuitansi adalah snapshot saat sah dari server. Petugas dapat
 * memverifikasi transfer menunggu, atau membatalkan/menolak dengan alasan;
 * pembatalan pembayaran dari tabungan mengembalikan saldo di server.
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
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!b) return <LoadingState label="Memeriksa akses kuitansi…" />;
  const kelola = b.akses.kelola && b.santri.aktif && b.status !== 'Dibatalkan';
  const internal = b.akses.sumber !== 'wali';
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
  return (
    <Halaman>
      <Panel style={{ gap: 10 }}>
        <ThemedText type="h3">{b.nomor_kuitansi}</ThemedText>
        <ChipRow><StatusBadge status={b.status} /></ChipRow>
        <Baris label="Santri" value={`${b.santri.nama} · NIS ${b.santri.nis}`} />
        <Baris label="Tagihan" value={labelPeriode(b.periode)} />
        <Baris label="Nominal" value={rupiah(b.nominal)} />
        <Baris label="Cara" value={b.sumber === 'Tabungan' ? 'Dari tabungan santri' : b.sumber} />
        <Baris label="Tanggal pembayaran" value={tanggalPanjang(b.tanggal_transaksi)} />
        {b.tabungan ? <Baris label="Debit tabungan" value={b.tabungan.nomor_kuitansi} /> : null}
        {internal && b.referensi ? <Baris label="Referensi transfer" value={b.referensi} /> : null}
        {internal && b.catatan ? <Baris label="Catatan" value={b.catatan} /> : null}
        <Baris label="Dicatat" value={`${b.pencatat.nama}, ${waktuPendek(b.dicatat_pada)}`} />
        {b.verifikasi ? <Baris label="Disahkan" value={`${b.verifikasi.oleh}, ${waktuPendek(b.verifikasi.pada)}`} /> : null}
      </Panel>
      {b.kuitansi ? (
        <Panel style={{ gap: 8 }}>
          <ThemedText type="h3">Kuitansi (saat sah)</ThemedText>
          <Baris label={`Total tagihan (versi ${b.kuitansi.tagihan_versi})`} value={rupiah(b.kuitansi.total_tagihan)} />
          <Baris label="Dibayar sebelumnya" value={rupiah(b.kuitansi.terbayar_sebelum)} />
          <Baris label="Pembayaran ini" value={rupiah(b.nominal)} />
          <Baris label="Sisa sesudah pembayaran" value={rupiah(b.kuitansi.sisa_sesudah)} />
        </Panel>
      ) : null}
      {b.pembatalan ? (
        <Panel style={{ gap: 6 }}>
          <ThemedText type="h3">{b.pembatalan.jenis ?? 'Pembatalan'}</ThemedText>
          {b.pembatalan.oleh ? <ThemedText>{b.pembatalan.oleh}, {waktuPendek(b.pembatalan.pada ?? null)}</ThemedText> : null}
          {internal && b.pembatalan.alasan ? <ThemedText>Alasan: {b.pembatalan.alasan}</ThemedText> : null}
          {b.tabungan?.pengembalian_id ? <ThemedText type="caption" themeColor="textSecondary">Saldo tabungan sudah dikembalikan.</ThemedText> : null}
        </Panel>
      ) : null}
      <Pesan text={pesan} tone="success" />
      <Pesan text={guard.error} tone="danger" />
      {kelola ? (
        <Panel style={{ gap: 10 }}>
          {b.status === 'Menunggu' && !batal ? <AppButton label="Dana sudah diperiksa — verifikasi" loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void putus('verifikasi')} /> : null}
          {batal ? (
            <>
              <PrivateField label={b.status === 'Menunggu' ? 'Alasan penolakan (wajib)' : 'Alasan pembatalan (wajib)'} value={alasan} onChangeText={setAlasan} multiline maxLength={500} editable={!guard.isBusy} />
              <AppButton label={b.status === 'Menunggu' ? 'Tolak transfer' : 'Batalkan pembayaran'} variant="danger" loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void putus('batal')} />
              <AppButton label="Batal" variant="secondary" disabled={guard.isBusy} onPress={() => { setBatal(false); guard.reset(); }} />
            </>
          ) : (
            <AppButton label={b.status === 'Menunggu' ? 'Tolak transfer…' : 'Batalkan pembayaran…'} variant="outline" disabled={guard.isBusy} onPress={() => { setBatal(true); guard.reset(); }} />
          )}
        </Panel>
      ) : null}
      <AppButton label="Buka tagihan" variant="secondary" onPress={() => router.push({ pathname: '/keuangan/tagihan/[id]', params: { id: String(b.tagihan_id) } })} />
      {b.tabungan ? <AppButton label="Buka debit tabungan" variant="secondary" onPress={() => router.push({ pathname: '/keuangan/tabungan/[id]', params: { id: String(b.tabungan!.transaksi_id) } })} /> : null}
      <AppButton label="Muat ulang" variant="secondary" onPress={() => { setPesan(null); void load(); }} />
    </Halaman>
  );
}
