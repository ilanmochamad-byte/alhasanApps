import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { ApiError } from '@/api/client';
import { kesehatan } from '@/api/kesehatan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Baris, Halaman, Pesan, tanggalPanjang } from '@/components/kesehatan-shared';
import { PrivateField } from '@/components/private-field';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { DateField } from '@/components/ui/date-field';
import { Panel } from '@/components/ui/surface';
import { useMutationGuard } from '@/hooks/use-mutation-guard';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { sidikJari, wajibAlasan } from '@/kesehatan/forms';

/** Mencatat hasil rujukan yang masih menunggu — koreksi berversi (alasan wajib bila tercatat). */
export default function HasilRujukanScreen() {
  const { profile } = useAuth();
  const { id, rujukan } = useLocalSearchParams<{ id: string; rujukan: string }>();
  return <Form key={`${profile?.id}:${id}:${rujukan}`} id={Number(id)} rujukanId={Number(rujukan)} />;
}

function Form({ id, rujukanId }: { id: number; rujukanId: number }) {
  const router = useRouter();
  const [hasil, setHasil] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [alasan, setAlasan] = useState('');
  const bersihkan = useCallback(() => { setHasil(''); setTanggal(''); setAlasan(''); }, []);
  const fetcher = useCallback(async () => {
    const k = await kesehatan.detail(id);
    if (!k.akses.catat) throw new ApiError('Hasil rujukan hanya dicatat petugas kesehatan berpenugasan aktif.', 403, 'FORBIDDEN');
    const r = k.rujukan.find(x => x.id === rujukanId);
    if (!r) throw new ApiError('Rujukan tidak ditemukan pada kunjungan ini.', 404, 'NOT_FOUND');
    return { k, r };
  }, [id, rujukanId]);
  const { data, error, load } = usePrivateResource(fetcher, bersihkan, true);
  const guard = useMutationGuard('kesehatan-hasil-rujukan');
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState label="Memuat rujukan…" />;
  const { k, r } = data;
  async function simpan() {
    const salah = k.status === 'Tercatat' ? wajibAlasan(alasan) : null;
    if (salah) { guard.setError(salah); return; }
    if (!hasil.trim()) { guard.setError('Hasil rujukan wajib diisi.'); return; }
    const body = { versi: k.versi, alasan, hasil, tanggal_hasil: tanggal };
    const ok = await guard.run(sidikJari('hasil', id, rujukanId, body), key => kesehatan.hasilRujukan(id, rujukanId, body, key));
    if (ok) { bersihkan(); router.back(); }
  }
  return (
    <Halaman>
      <Panel style={{ gap: 10 }}>
        <Baris label="Santri" value={k.santri.nama} />
        <Baris label="Tujuan rujukan" value={r.tujuan} />
        <Baris label="Tanggal rujukan" value={tanggalPanjang(r.tanggal_rujukan)} />
        <Baris label="Status" value={r.status} />
      </Panel>
      {r.status !== 'Menunggu hasil' ? (
        <ThemedText>Hasil rujukan ini sudah tercatat. Gunakan koreksi catatan untuk mengubahnya.</ThemedText>
      ) : (
        <Panel style={{ gap: 12 }}>
          <PrivateField label="Hasil rujukan (wajib)" value={hasil} onChangeText={setHasil} multiline maxLength={4000} />
          <DateField label="Tanggal hasil" value={tanggal} placeholder="Hari ini" onChange={setTanggal} />
          <PrivateField label={k.status === 'Tercatat' ? 'Alasan (wajib)' : 'Alasan (opsional untuk draf)'} value={alasan} onChangeText={setAlasan} multiline maxLength={1000} />
          <Pesan text={guard.error} tone="danger" />
          {guard.error?.includes('Muat ulang') ? <AppButton label="Muat versi terbaru" variant="danger" onPress={() => { bersihkan(); guard.reset(); void load(); }} /> : null}
          <AppButton label="Simpan hasil rujukan" loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void simpan()} />
        </Panel>
      )}
    </Halaman>
  );
}
