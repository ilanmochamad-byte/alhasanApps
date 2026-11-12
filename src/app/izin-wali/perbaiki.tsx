import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { izinWali, type DetailWali, type IsianIzin } from '@/api/izin-wali';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Halaman, Pesan } from '@/components/izin-wali-shared';
import { waktuPendek } from '@/components/kesehatan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { ActionBar } from '@/components/ui/action-bar';
import { Field } from '@/components/ui/app-field';
import { AvatarInisial } from '@/components/ui/avatar-inisial';
import { DateField } from '@/components/ui/date-field';
import { Notice } from '@/components/ui/notice';
import { Overline, Panel } from '@/components/ui/surface';
import { useTheme } from '@/hooks/use-theme';

import { useIzinWaliMutation } from '@/hooks/use-izin-wali-mutation';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { isianBerubah, periksaIsian, rapikan } from '@/izin-wali/forms';

const JUDUL = 'Perbaiki pengajuan';

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
  const theme = useTheme();
  // Draf melekat pada isi dan versi yang benar-benar dilihat saat mulai menyunting.
  const [draf, setDraf] = useState<{ isian: IsianIzin; asal: IsianIzin; version: number } | null>(null);
  const [validasi, setValidasi] = useState<string | null>(null);
  const [konflik, setKonflik] = useState(false);
  const bersihkan = useCallback(() => setDraf(null), []);
  const fetcher = useCallback(async () => {
    if (!Number.isSafeInteger(id) || id < 1) throw new Error('Penunjuk pengajuan tidak valid.');
    return izinWali.detail(id);
  }, [id]);
  const { data, error, load, reject } = usePrivateResource(fetcher, bersihkan, true);
  const guard = useIzinWaliMutation('izin-wali-perbaiki', reject, () => setKonflik(true));

  if (error) return <Halaman title={JUDUL}><ErrorState message={error} onRetry={() => void load()} /></Halaman>;
  if (!data) return <Halaman title={JUDUL}><LoadingState label="Memuat pengajuan…" /></Halaman>;
  if (data.peran_akses !== 'wali' || !data.tindakan.perbaiki || data.pengajuan.version === undefined) {
    return <Halaman title={JUDUL}><EmptyState title="Perbaikan tidak tersedia" message="Perbaikan hanya dapat dikirim wali pengaju saat pembimbing memintanya." /></Halaman>;
  }
  const detail = data as DetailWali;
  const p = detail.pengajuan;
  const version = draf?.version ?? p.version as number;
  const terbaru: IsianIzin = { tgl_izin: p.tgl_izin, tgl_kembali: p.tgl_kembali, alasan: p.alasan ?? '', catatan: p.catatan ?? '' };
  const asal = draf?.asal ?? terbaru;
  const nilai = draf?.isian ?? terbaru;
  const ubah = (bagian: Partial<IsianIzin>) => setDraf({ isian: { ...nilai, ...bagian }, asal, version });
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
    <Halaman
      title={JUDUL}
      footer={
        <ActionBar>
          <AppButton label="Kirim perbaikan" style={{ flex: 1 }} loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void kirim()} />
        </ActionBar>
      }>
      {/* Catatan pembimbing di atas, dalam kartu peringatan. */}
      {permintaan ? (
        <Notice tone="warning" icon="info" title="Permintaan pembimbing" selectable={false}>
          <ThemedText type="caption" themeColor="textSecondary">{permintaan.pembimbing} · {waktuPendek(permintaan.waktu)}</ThemedText>
          <ThemedText>{permintaan.catatan || '—'}</ThemedText>
        </Notice>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 20, borderCurve: 'continuous', padding: 12, backgroundColor: theme.primarySoft, borderColor: theme.primaryBorder }}>
        <AvatarInisial nama={p.santri.nama} />
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText type="h3">{p.santri.nama}</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">NIS {p.santri.nis} · pengajuan #{p.id}</ThemedText>
        </View>
      </View>
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
      <Field label="Alasan izin" accessibilityLabel="Alasan izin" icon="izin" value={nilai.alasan} onChangeText={alasan => ubah({ alasan })} multiline />
      <Field label="Catatan" accessibilityLabel="Catatan" hint="Opsional" icon="info" value={nilai.catatan} onChangeText={catatan => ubah({ catatan })} multiline />
      <Pesan text={validasi ?? guard.error} tone="danger" />
      {konflik ? <AppButton label="Muat versi terbaru" variant="secondary" onPress={() => { setKonflik(false); setDraf(null); void load(); }} /> : null}
    </Halaman>
  );
}
