import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { ApiError } from '@/api/client';
import { keuangan } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Pesan } from '@/components/kesehatan-shared';
import { Centang, Halaman } from '@/components/keuangan-shared';
import { PrivateField } from '@/components/private-field';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Panel } from '@/components/ui/surface';
import { useMutationGuard } from '@/hooks/use-mutation-guard';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { galatNominal, labelPeriode, nominalKirim, rupiah, sidikJari } from '@/keuangan/forms';

/**
 * Bayar tagihan dari tabungan — tindakan EKSPLISIT dengan persetujuan
 * tercentang. Server memeriksa saldo dan sisa, lalu membukukan debit tabungan
 * dan pembayaran dalam satu transaksi berujukan silang; ketukan ganda atau
 * retry dengan kunci yang sama tidak menghasilkan debit kedua.
 */
export default function BayarTabunganScreen() {
  const { profile } = useAuth();
  const { tagihan_id } = useLocalSearchParams<{ tagihan_id: string }>();
  return <Form key={`${profile?.id}:${tagihan_id}`} tagihanId={Number(tagihan_id)} />;
}

function Form({ tagihanId }: { tagihanId: number }) {
  const router = useRouter();
  const [nominal, setNominal] = useState('');
  const [catatan, setCatatan] = useState('');
  const [setuju, setSetuju] = useState(false);
  const bersihkan = useCallback(() => { setNominal(''); setCatatan(''); setSetuju(false); }, []);
  const fetcher = useCallback(async () => {
    if (!Number.isSafeInteger(tagihanId) || tagihanId < 1) throw new Error('Penunjuk tagihan tidak valid.');
    const t = await keuangan.tagihan(tagihanId);
    if (!t.akses.kelola || !t.santri.aktif) throw new ApiError('Pembayaran dari tabungan hanya oleh Petugas BSA berpenugasan aktif untuk santri aktif.', 403, 'FORBIDDEN');
    const saldo = await keuangan.santri(t.santri.id, 1);
    return { t, saldo: saldo.saldo };
  }, [tagihanId]);
  const { data, error, load } = usePrivateResource(fetcher, bersihkan, true);
  const guard = useMutationGuard('bsa-bayar-tabungan');
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState label="Memuat saldo dan sisa tagihan…" />;
  const { t, saldo } = data;
  async function simpan() {
    const g = galatNominal(nominal);
    if (g) { guard.setError(g); return; }
    if (!setuju) { guard.setError('Centang persetujuan bahwa tabungan santri dipotong untuk tagihan ini.'); return; }
    const n = nominalKirim(nominal);
    const r = await guard.run(sidikJari('bayar-tabungan', tagihanId, n, catatan.trim()), key => keuangan.bayarTabungan(tagihanId, n, catatan.trim(), key));
    if (r) router.replace({ pathname: '/keuangan/pembayaran/[id]', params: { id: String(r.id) } });
  }
  return (
    <Halaman>
      <Panel style={{ gap: 6 }}>
        <ThemedText type="h3">Tagihan {labelPeriode(t.periode)}</ThemedText>
        <ThemedText>{t.santri.nama} · NIS {t.santri.nis}</ThemedText>
        <ThemedText type="bodyBold">Sisa tagihan {rupiah(t.sisa)}{t.menunggu > 0 ? ` (transfer menunggu ${rupiah(t.menunggu)})` : ''}</ThemedText>
        <ThemedText type="bodyBold">Saldo tabungan {rupiah(saldo)}</ThemedText>
      </Panel>
      <Panel style={{ gap: 12 }}>
        <PrivateField label="Nominal dipotong dari tabungan" value={nominal} onChangeText={setNominal} keyboardType="number-pad" maxLength={16} editable={!guard.isBusy} />
        <PrivateField label="Catatan internal" hint="Opsional" value={catatan} onChangeText={setCatatan} multiline maxLength={500} editable={!guard.isBusy} />
        <Centang label="Saya menyetujui tabungan santri ini dipotong untuk membayar tagihan ini." checked={setuju} onChange={setSetuju} disabled={guard.isBusy} />
        <ThemedText type="caption" themeColor="textSecondary">Debit tabungan dan pembayaran dicatat bersama atau tidak sama sekali. Bukan penerimaan kas baru.</ThemedText>
      </Panel>
      <Pesan text={guard.error} tone="danger" />
      <AppButton label="Bayar dari tabungan" loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void simpan()} />
    </Halaman>
  );
}
