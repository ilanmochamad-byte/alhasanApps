import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { ApiError } from '@/api/client';
import { keuangan } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Pesan } from '@/components/kesehatan-shared';
import { Halaman } from '@/components/keuangan-shared';
import { PrivateField } from '@/components/private-field';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Chip, ChipRow } from '@/components/ui/chip';
import { DateField } from '@/components/ui/date-field';
import { Panel } from '@/components/ui/surface';
import { useMutationGuard } from '@/hooks/use-mutation-guard';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { galatAlasan, galatNominal, labelPeriode, nominalKirim, rupiah, sidikJari } from '@/keuangan/forms';

/**
 * Revisi (baris potongan/tambahan atau jatuh tempo baru) atau pembatalan
 * tagihan, beralasan dan berversi. Versi yang dikirim adalah versi saat
 * layar dimuat; bila tagihan sudah berubah, server menjawab 409 dan isian
 * TIDAK dikirim ulang otomatis — petugas memuat versi terbaru lebih dulu.
 */
export default function UbahTagihanScreen() {
  const { profile } = useAuth();
  const { tagihan_id } = useLocalSearchParams<{ tagihan_id: string }>();
  return <Form key={`${profile?.id}:${tagihan_id}`} tagihanId={Number(tagihan_id)} />;
}

function Form({ tagihanId }: { tagihanId: number }) {
  const router = useRouter();
  const [mode, setMode] = useState<'revisi' | 'batal'>('revisi');
  const [jenis, setJenis] = useState<'' | 'Potongan' | 'Tambahan'>('');
  const [nama, setNama] = useState('');
  const [nominal, setNominal] = useState('');
  const [jatuhTempo, setJatuhTempo] = useState('');
  const [alasan, setAlasan] = useState('');
  const [versi, setVersi] = useState<number | null>(null);
  const bersihkan = useCallback(() => { setJenis(''); setNama(''); setNominal(''); setJatuhTempo(''); setAlasan(''); setVersi(null); }, []);
  const fetcher = useCallback(async () => {
    if (!Number.isSafeInteger(tagihanId) || tagihanId < 1) throw new Error('Penunjuk tagihan tidak valid.');
    const t = await keuangan.tagihan(tagihanId);
    if (!t.akses.kelola || !t.santri.aktif || t.status !== 'Terbit') throw new ApiError('Tagihan ini tidak dapat diubah oleh akun Anda.', 403, 'FORBIDDEN');
    // Revalidasi dari latar tidak menimpa versi yang sedang diedit.
    setVersi(v => v ?? t.versi);
    return t;
  }, [tagihanId]);
  const { data: t, error, load } = usePrivateResource(fetcher, bersihkan, true);
  const guard = useMutationGuard('bsa-ubah-tagihan');
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!t) return <LoadingState label="Memuat versi terbaru…" />;
  const v = versi ?? t.versi;
  async function simpan() {
    const ga = galatAlasan(alasan);
    if (ga) { guard.setError(ga); return; }
    if (mode === 'batal') {
      const r = await guard.run(sidikJari('batal', tagihanId, v, alasan.trim()), key => keuangan.batalTagihan(tagihanId, v, alasan.trim(), key));
      if (r) router.back();
      return;
    }
    if (jenis === '' && !jatuhTempo) { guard.setError('Isi baris potongan/tambahan atau jatuh tempo baru.'); return; }
    if (jenis !== '') { const g = galatNominal(nominal); if (g) { guard.setError(g); return; } }
    const body = { versi: v, jenis, nama: nama.trim(), nominal: jenis === '' ? '' : nominalKirim(nominal), jatuh_tempo: jatuhTempo, alasan: alasan.trim() };
    const r = await guard.run(sidikJari('revisi', tagihanId, body), key => keuangan.revisi(tagihanId, body, key));
    if (r) router.back();
  }
  const muatUlang = () => { bersihkan(); guard.reset(); void load(); };
  return (
    <Halaman>
      <Panel style={{ gap: 6 }}>
        <ThemedText type="h3">Tagihan {labelPeriode(t.periode)} · versi {v}</ThemedText>
        <ThemedText>{t.santri.nama} · total {rupiah(t.total)} · dibayar {rupiah(t.terbayar)}</ThemedText>
      </Panel>
      <ChipRow>
        <Chip label="Revisi" accessibilityRole="radio" selected={mode === 'revisi'} onPress={() => { setMode('revisi'); guard.reset(); }} />
        <Chip label="Batalkan tagihan" accessibilityRole="radio" selected={mode === 'batal'} onPress={() => { setMode('batal'); guard.reset(); }} />
      </ChipRow>
      <Panel style={{ gap: 12 }}>
        {mode === 'revisi' ? (
          <>
            <ThemedText type="label">Baris koreksi (opsional)</ThemedText>
            <ChipRow>
              <Chip label="Tanpa baris" accessibilityRole="radio" selected={jenis === ''} onPress={() => setJenis('')} />
              <Chip label="Potongan" accessibilityRole="radio" selected={jenis === 'Potongan'} onPress={() => setJenis('Potongan')} />
              <Chip label="Tambahan" accessibilityRole="radio" selected={jenis === 'Tambahan'} onPress={() => setJenis('Tambahan')} />
            </ChipRow>
            {jenis !== '' ? (
              <>
                <PrivateField label="Keterangan" hint="Opsional" value={nama} onChangeText={setNama} maxLength={100} />
                <PrivateField label="Nominal (rupiah)" value={nominal} onChangeText={setNominal} keyboardType="number-pad" maxLength={16} />
              </>
            ) : null}
            <DateField label="Jatuh tempo baru" value={jatuhTempo} placeholder="Tidak berubah" onChange={setJatuhTempo} />
          </>
        ) : (
          <ThemedText>Pembatalan hanya untuk tagihan tanpa pembayaran. Tagihan tetap tersimpan di riwayat.</ThemedText>
        )}
        <PrivateField label="Alasan (wajib)" value={alasan} onChangeText={setAlasan} multiline maxLength={500} editable={!guard.isBusy} />
      </Panel>
      <Pesan text={guard.error} tone="danger" />
      {guard.error?.includes('Muat ulang') ? <AppButton label="Muat versi terbaru (isian ini dibuang)" variant="danger" onPress={muatUlang} /> : null}
      <AppButton label={mode === 'batal' ? 'Batalkan tagihan' : 'Simpan revisi'} variant={mode === 'batal' ? 'danger' : 'primary'}
        loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void simpan()} />
    </Halaman>
  );
}
