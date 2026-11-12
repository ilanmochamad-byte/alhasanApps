import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { ApiError } from '@/api/client';
import { keuangan, type IsianPembayaran } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Centang, Halaman, HalamanKeadaan, Kartu, KartuSantri, Pesan } from '@/components/keuangan-shared';
import { PrivateField } from '@/components/private-field';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { DateField } from '@/components/ui/date-field';
import { FilterPills } from '@/components/ui/filter-pills';
import { useKeuanganMutation } from '@/hooks/use-keuangan-mutation';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { galatNominal, labelPeriode, nominalKirim, rupiah, sidikJari, tanggalKini } from '@/keuangan/forms';

const JUDUL = 'Catat pembayaran';

/**
 * Catat pembayaran tagihan tunai/transfer (pola P-Form → kuitansi). Tunai
 * sah seketika; transfer tanpa pernyataan "sudah diperiksa" menunggu
 * verifikasi. Nominal di atas sisa (dikurangi transfer menunggu) ditolak
 * server. Sesudah tercatat, layar kuitansi menampilkan panel hasil.
 */
export default function BayarScreen() {
  const { profile } = useAuth();
  const { tagihan_id } = useLocalSearchParams<{ tagihan_id: string }>();
  return <Form key={`${profile?.id}:${tagihan_id}`} tagihanId={Number(tagihan_id)} />;
}

const kosong = (): IsianPembayaran => ({ nominal: '', sumber: 'Tunai', tanggal_transaksi: tanggalKini(), referensi: '', catatan: '', terverifikasi: false });

function Form({ tagihanId }: { tagihanId: number }) {
  const router = useRouter();
  const [isi, setIsi] = useState<IsianPembayaran>(kosong);
  const bersihkan = useCallback(() => setIsi(kosong()), []);
  const fetcher = useCallback(async () => {
    if (!Number.isSafeInteger(tagihanId) || tagihanId < 1) throw new Error('Penunjuk tagihan tidak valid.');
    const t = await keuangan.tagihan(tagihanId);
    if (!t.akses.kelola || !t.santri.aktif) throw new ApiError('Pembayaran hanya dicatat Petugas BSA berpenugasan aktif untuk santri aktif.', 403, 'FORBIDDEN');
    return t;
  }, [tagihanId]);
  const { data: t, error, load, reject } = usePrivateResource(fetcher, bersihkan, true);
  const guard = useKeuanganMutation('bsa-bayar', reject);
  if (error) return <HalamanKeadaan title={JUDUL}><ErrorState message={error} onRetry={() => void load()} /></HalamanKeadaan>;
  if (!t) return <HalamanKeadaan title={JUDUL}><LoadingState label="Memuat sisa tagihan…" /></HalamanKeadaan>;
  const transfer = isi.sumber === 'Transfer';
  async function simpan() {
    const g = galatNominal(isi.nominal);
    if (g) { guard.setError(g); return; }
    if (transfer && !isi.referensi.trim()) { guard.setError('Referensi transfer wajib diisi agar dapat diperiksa.'); return; }
    const kirim = { ...isi, nominal: nominalKirim(isi.nominal), referensi: isi.referensi.trim(), catatan: isi.catatan.trim() };
    const r = await guard.run(sidikJari('bayar', tagihanId, kirim), key => keuangan.bayar(tagihanId, kirim, key));
    if (r) router.replace({ pathname: '/keuangan/pembayaran/[id]', params: { id: String(r.id) } });
  }
  return (
    <Halaman title={JUDUL}
      bawah={<AppButton label="Catat pembayaran" loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void simpan()} style={{ flex: 1 }} />}>
      <KartuSantri nama={t.santri.nama} keterangan={`Tagihan ${labelPeriode(t.periode)} · NIS ${t.santri.nis}`}
        angka={[
          { label: 'Sisa tagihan', nilai: rupiah(t.sisa), tone: t.sisa > 0 ? 'danger' : undefined },
          ...(t.menunggu > 0 ? [{ label: 'Transfer menunggu', nilai: rupiah(t.menunggu), tone: 'warning' as const }] : []),
        ]} />
      <Kartu>
        <ThemedText type="label">Cara pembayaran</ThemedText>
        <FilterPills accessibilityLabel="Cara pembayaran" value={isi.sumber} onChange={v => setIsi({ ...isi, sumber: v })}
          options={[{ value: 'Tunai', label: 'Tunai' }, { value: 'Transfer', label: 'Transfer' }]} />
        <PrivateField label="Nominal (rupiah)" awalan="Rp" value={isi.nominal} onChangeText={v => setIsi({ ...isi, nominal: v })} keyboardType="number-pad" maxLength={16} editable={!guard.isBusy} placeholder="mis. 100.000" />
        <DateField label="Tanggal pembayaran" value={isi.tanggal_transaksi} onChange={v => setIsi({ ...isi, tanggal_transaksi: v })} />
        {transfer ? <PrivateField label="Referensi transfer (wajib)" icon="text-size" value={isi.referensi} onChangeText={v => setIsi({ ...isi, referensi: v })} maxLength={100} editable={!guard.isBusy} /> : null}
        <PrivateField label="Catatan internal" hint={`Opsional · ${isi.catatan.length}/500`} value={isi.catatan} onChangeText={v => setIsi({ ...isi, catatan: v })} multiline maxLength={500} editable={!guard.isBusy} />
        {transfer ? (
          <>
            <Centang label="Saya sudah memeriksa dana transfer ini masuk." checked={isi.terverifikasi} onChange={v => setIsi({ ...isi, terverifikasi: v })} disabled={guard.isBusy} />
            <ThemedText type="caption" themeColor="textSecondary">Tanpa centang, pembayaran menunggu verifikasi dan belum mengurangi sisa.</ThemedText>
          </>
        ) : null}
      </Kartu>
      <Pesan text={guard.error} tone="danger" />
    </Halaman>
  );
}
