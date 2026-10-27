import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { izinWali, type DetailWali, type IsianIzin } from '@/api/izin-wali';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Baris, Halaman, Pesan } from '@/components/izin-wali-shared';
import { waktuPendek } from '@/components/kesehatan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Field } from '@/components/ui/app-field';
import { DateField } from '@/components/ui/date-field';
import { Overline, Panel } from '@/components/ui/surface';
import { useIzinWaliMutation } from '@/hooks/use-izin-wali-mutation';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { isianBerubah, periksaIsian, rapikan } from '@/izin-wali/forms';

/**
 * Wali pengaju memperbaiki isi dan mengirim ulang — hanya saat pembimbing
 * memintanya (tindakan `perbaiki` dari server). Versi yang dimuat ikut dikirim;
 * bila pengajuan sudah berubah (dibatalkan, ditinjau ulang), server menjawab
 * 409 tanpa mengubah apa pun. Versi lama tetap tersimpan di riwayat server.
 */
export default function PerbaikiIzinWaliScreen() {
  const { profile } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Perbaiki key={`${profile?.id}:${id}`} id={Number(id)} />;
}

function Perbaiki({ id }: { id: number }) {
  const router = useRouter();
  const [isian, setIsian] = useState<IsianIzin | null>(null);
  const [validasi, setValidasi] = useState<string | null>(null);
  const [konflik, setKonflik] = useState(false);
  const bersihkan = useCallback(() => setIsian(null), []);
  const fetcher = useCallback(async () => {
    if (!Number.isSafeInteger(id) || id < 1) throw new Error('Penunjuk pengajuan tidak valid.');
    return izinWali.detail(id);
  }, [id]);
  const { data, error, load, reject } = usePrivateResource(fetcher, bersihkan, true);
  const guard = useIzinWaliMutation('izin-wali-perbaiki', reject, () => setKonflik(true));

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState label="Memuat pengajuan…" />;
  if (data.peran_akses !== 'wali' || !data.tindakan.perbaiki || data.pengajuan.version === undefined) {
    return <Halaman><EmptyState title="Perbaikan tidak tersedia" message="Perbaikan hanya dapat dikirim wali pengaju saat pembimbing memintanya." /></Halaman>;
  }
  const detail = data as DetailWali;
  const p = detail.pengajuan;
  const version = p.version as number;
  const asal: IsianIzin = { tgl_izin: p.tgl_izin, tgl_kembali: p.tgl_kembali, alasan: p.alasan ?? '', catatan: p.catatan ?? '' };
  const nilai = isian ?? asal;
  const ubah = (bagian: Partial<IsianIzin>) => setIsian({ ...nilai, ...bagian });
  const permintaan = [...(detail.tinjauan ?? [])].reverse().find(t => t.tindakan === 'minta_perbaikan');

  async function kirim() {
    const masalah = periksaIsian(nilai) ?? (isianBerubah(asal, nilai) ? null : 'Isi pengajuan belum diubah. Perbaiki tanggal, alasan, atau catatan sesuai permintaan pembimbing.');
    setValidasi(masalah);
    if (masalah !== null) return;
    const kiriman = rapikan(nilai);
    const hasil = await guard.run(JSON.stringify({ id, kiriman, version }), key => izinWali.perbaiki(id, kiriman, version, key));
    if (hasil) router.back();
  }

  return (
    <Halaman>
      <ThemedText type="h3">{p.santri.nama}</ThemedText>
      {permintaan ? (
        <Panel style={{ gap: 6 }}>
          <Overline>Permintaan pembimbing</Overline>
          <Baris label={`${permintaan.pembimbing} · ${waktuPendek(permintaan.waktu)}`} value={permintaan.catatan} />
        </Panel>
      ) : null}
      <Panel style={{ gap: 10 }}>
        <Overline>Rentang izin</Overline>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <View style={{ flex: 1, minWidth: 150 }}>
            <DateField label="Tanggal izin" value={nilai.tgl_izin}
              onChange={next => ubah({ tgl_izin: next, ...(nilai.tgl_kembali < next ? { tgl_kembali: next } : {}) })} />
          </View>
          <View style={{ flex: 1, minWidth: 150 }}>
            <DateField label="Tanggal kembali" value={nilai.tgl_kembali} onChange={next => ubah({ tgl_kembali: next })} minimumDate={nilai.tgl_izin || undefined} />
          </View>
        </View>
      </Panel>
      <Field label="Alasan izin" accessibilityLabel="Alasan izin" value={nilai.alasan} onChangeText={alasan => ubah({ alasan })} multiline />
      <Field label="Catatan" accessibilityLabel="Catatan" hint="Opsional" value={nilai.catatan} onChangeText={catatan => ubah({ catatan })} multiline />
      <Pesan text={validasi ?? guard.error} tone="danger" />
      {konflik ? <AppButton label="Muat versi terbaru" variant="secondary" onPress={() => { setKonflik(false); setIsian(null); void load(); }} /> : null}
      <AppButton label="Kirim perbaikan" loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void kirim()} />
    </Halaman>
  );
}
