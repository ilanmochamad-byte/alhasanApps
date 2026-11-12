import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { keuangan } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { tanggalPanjang } from '@/components/kesehatan-shared';
import { Halaman, HalamanKeadaan, JudulBagian, Penomoran, Pesan, StatusBadge, TombolMuatUlang } from '@/components/keuangan-shared';
import { SetoranTransferKartu } from '@/components/keuangan-setoran';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { EntityRow } from '@/components/ui/entity-row';
import { FilterPills } from '@/components/ui/filter-pills';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { labelPeriode, rupiah } from '@/keuangan/forms';

const JUDUL = 'Verifikasi transfer';
type Antrean = 'setoran' | 'pembayaran';

/**
 * Antrean transfer yang menunggu verifikasi (pola P-Daftar): setoran
 * tabungan dan pembayaran tagihan. Admin hanya melihat; Petugas BSA
 * memverifikasi atau menolak. Setoran diputus langsung di kartunya;
 * pembayaran diputus di kuitansinya.
 */
export default function VerifikasiScreen() {
  const { profile } = useAuth();
  return <Daftar key={profile?.id} />;
}

function Daftar() {
  const router = useRouter();
  const [halSetoran, setHalSetoran] = useState(1);
  const [antrean, setAntrean] = useState<Antrean>('setoran');
  const [pesan, setPesan] = useState<string | null>(null);
  const fetcher = useCallback(async () => {
    const [setoran, bayar] = await Promise.all([
      keuangan.setoranTransfer('Menunggu', '', halSetoran),
      keuangan.daftarPembayaran({ status: 'Menunggu', sumber: 'Transfer' }, 1),
    ]);
    return { setoran, bayar };
  }, [halSetoran]);
  const { data, error, load, reject } = usePrivateResource(fetcher);
  if (error) return <HalamanKeadaan title={JUDUL}><ErrorState message={error} onRetry={() => void load()} /></HalamanKeadaan>;
  if (!data) return <HalamanKeadaan title={JUDUL}><LoadingState label="Memuat antrean transfer…" /></HalamanKeadaan>;
  const kelola = data.setoran.akses.kelola;
  return (
    <Halaman title={kelola ? JUDUL : 'Transfer menunggu'} actions={<TombolMuatUlang onPress={() => { setPesan(null); void load(); }} />}>
      <FilterPills<Antrean> role="tab" accessibilityLabel="Antrean verifikasi" value={antrean} onChange={setAntrean}
        options={[
          { value: 'setoran', label: `Setoran · ${data.setoran.total}`, icon: 'wallet' },
          { value: 'pembayaran', label: `Pembayaran · ${data.bayar.total}`, icon: 'check-circle' },
        ]} />
      {!kelola ? <Pesan tone="info" text="Hanya membaca. Verifikasi dan penolakan dilakukan Petugas BSA berpenugasan aktif." /> : null}
      <Pesan text={pesan} tone="success" />
      {antrean === 'setoran' ? (
        <>
          <JudulBagian title={`Setoran tabungan (${data.setoran.total})`} />
          {data.setoran.rows.length === 0 ? <EmptyState icon="check-circle" title="Tidak ada setoran menunggu" message="Semua setoran transfer sudah diputus." /> : null}
          {data.setoran.rows.map(s => (
            <SetoranTransferKartu onDenied={reject} key={s.id} s={s} kelola={kelola} santri={{ nama: s.santri.nama, nis: s.santri.nis }} onSelesai={p => { setPesan(p); void load(); }} />
          ))}
          <Penomoran page={data.setoran.page} total={data.setoran.total} perPage={data.setoran.per_page} onPage={setHalSetoran} />
        </>
      ) : (
        <>
          <JudulBagian title={`Pembayaran tagihan (${data.bayar.total})`} />
          {data.bayar.rows.length === 0 ? <EmptyState icon="check-circle" title="Tidak ada pembayaran menunggu" message="Semua transfer pembayaran sudah diputus." /> : null}
          {data.bayar.rows.map(b => (
            <EntityRow key={b.id} avatarName={b.santri.nama} tone="warning" highlight={kelola ? 'warning' : undefined}
              title={b.santri.nama}
              subtitle={`${b.nomor_kuitansi} · tagihan ${labelPeriode(b.periode)}`}
              value={rupiah(b.nominal)}
              detail={(
                <ThemedText selectable type="caption" themeColor={kelola ? 'primary' : 'textSecondary'}>
                  {tanggalPanjang(b.tanggal_transaksi)}{kelola ? ' · ketuk untuk memverifikasi atau menolak' : ''}
                </ThemedText>
              )}
              pill={<StatusBadge status={b.status} />}
              accessibilityLabel={`Buka pembayaran ${b.nomor_kuitansi}`}
              onPress={() => router.push({ pathname: '/keuangan/pembayaran/[id]', params: { id: String(b.id) } })} />
          ))}
          {data.bayar.total > data.bayar.rows.length ? <ThemedText selectable type="caption" themeColor="textSecondary">Menampilkan {data.bayar.rows.length} dari {data.bayar.total}; buka Pembayaran tagihan untuk seluruhnya.</ThemedText> : null}
        </>
      )}
    </Halaman>
  );
}
