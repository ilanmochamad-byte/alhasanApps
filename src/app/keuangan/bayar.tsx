import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { ApiError } from '@/api/client';
import { keuangan, type IsianPembayaran } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Pesan } from '@/components/kesehatan-shared';
import { Centang, Halaman } from '@/components/keuangan-shared';
import { PrivateField } from '@/components/private-field';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Chip, ChipRow } from '@/components/ui/chip';
import { DateField } from '@/components/ui/date-field';
import { Panel } from '@/components/ui/surface';
import { useMutationGuard } from '@/hooks/use-mutation-guard';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { galatNominal, labelPeriode, nominalKirim, rupiah, sidikJari, tanggalKini } from '@/keuangan/forms';

/**
 * Catat pembayaran tagihan tunai/transfer. Tunai sah seketika; transfer
 * tanpa pernyataan "sudah diperiksa" menunggu verifikasi. Nominal di atas
 * sisa (dikurangi transfer menunggu) ditolak server.
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
  const { data: t, error, load } = usePrivateResource(fetcher, bersihkan, true);
  const guard = useMutationGuard('bsa-bayar');
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!t) return <LoadingState label="Memuat sisa tagihan…" />;
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
    <Halaman>
      <Panel style={{ gap: 6 }}>
        <ThemedText type="h3">Tagihan {labelPeriode(t.periode)}</ThemedText>
        <ThemedText>{t.santri.nama} · NIS {t.santri.nis}</ThemedText>
        <ThemedText type="bodyBold">Sisa {rupiah(t.sisa)}{t.menunggu > 0 ? ` (transfer menunggu ${rupiah(t.menunggu)})` : ''}</ThemedText>
      </Panel>
      <Panel style={{ gap: 12 }}>
        <ChipRow>
          <Chip label="Tunai" accessibilityRole="radio" selected={!transfer} onPress={() => setIsi({ ...isi, sumber: 'Tunai' })} />
          <Chip label="Transfer" accessibilityRole="radio" selected={transfer} onPress={() => setIsi({ ...isi, sumber: 'Transfer' })} />
        </ChipRow>
        <PrivateField label="Nominal (rupiah)" value={isi.nominal} onChangeText={v => setIsi({ ...isi, nominal: v })} keyboardType="number-pad" maxLength={16} editable={!guard.isBusy} />
        <DateField label="Tanggal pembayaran" value={isi.tanggal_transaksi} onChange={v => setIsi({ ...isi, tanggal_transaksi: v })} />
        {transfer ? <PrivateField label="Referensi transfer (wajib)" value={isi.referensi} onChangeText={v => setIsi({ ...isi, referensi: v })} maxLength={100} editable={!guard.isBusy} /> : null}
        <PrivateField label="Catatan internal" hint="Opsional" value={isi.catatan} onChangeText={v => setIsi({ ...isi, catatan: v })} multiline maxLength={500} editable={!guard.isBusy} />
        {transfer ? (
          <>
            <Centang label="Saya sudah memeriksa dana transfer ini masuk." checked={isi.terverifikasi} onChange={v => setIsi({ ...isi, terverifikasi: v })} disabled={guard.isBusy} />
            <ThemedText type="caption" themeColor="textSecondary">Tanpa centang, pembayaran menunggu verifikasi dan belum mengurangi sisa.</ThemedText>
          </>
        ) : null}
      </Panel>
      <Pesan text={guard.error} tone="danger" />
      <AppButton label="Catat pembayaran" loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void simpan()} />
    </Halaman>
  );
}
