import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { actionableError } from '@/api/client';
import { kesehatan, type IsianRingkasan, type Pratinjau, type RingkasanInternal } from '@/api/kesehatan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Halaman, KontenRingkasan, Pesan, StatusBadge, tanggalPanjang, waktuPendek } from '@/components/kesehatan-shared';
import { PrivateField } from '@/components/private-field';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Chip, ChipRow } from '@/components/ui/chip';
import { Divider, Panel } from '@/components/ui/surface';
import { useMutationGuard } from '@/hooks/use-mutation-guard';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { sidikJari, wajibAlasan } from '@/kesehatan/forms';

/**
 * Ringkasan untuk wali satu kunjungan. Petugas: susun → pratinjau (persis
 * tampilan wali, dari server) → konfirmasi → terbitkan; ganti/tarik
 * beralasan. Admin: versi berlaku + riwayat (hanya baca). Pembimbing/murobi
 * terkait: versi berlaku saja. Catatan klinis tidak pernah disalin otomatis.
 */
export default function RingkasanScreen() {
  const { profile } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Ringkasan key={`${profile?.id}:${id}`} id={Number(id)} />;
}

const KOSONG = { ringkasan: '', tindakan_umum: '', tindak_lanjut_wali: '', alasan: '' };

function Ringkasan({ id }: { id: number }) {
  const [isi, setIsi] = useState(KOSONG);
  const [pratinjau, setPratinjau] = useState<Pratinjau | null>(null);
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const [memuatPratinjau, setMemuatPratinjau] = useState(false);
  const [alasanTarik, setAlasanTarik] = useState('');
  const [versiDraf, setVersiDraf] = useState<{ kunjungan_versi: number; revisi_ringkasan: number } | null>(null);
  const bersihkan = useCallback(() => { setIsi(KOSONG); setPratinjau(null); setKonfirmasi(false); setAlasanTarik(''); setVersiDraf(null); }, []);
  const fetcher = useCallback(async () => {
    const hasil = await kesehatan.ringkasan(id);
    setVersiDraf(v => v ?? { kunjungan_versi: hasil.kunjungan.versi, revisi_ringkasan: hasil.ringkasan?.revisi ?? 0 });
    return hasil;
  }, [id]);
  const { data, error, load } = usePrivateResource<RingkasanInternal>(fetcher, bersihkan, true);
  const terbit = useMutationGuard('kesehatan-terbit');
  const tarik = useMutationGuard('kesehatan-tarik');
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState label="Memuat ringkasan untuk wali…" />;

  const kepala = data.ringkasan;
  const penggantian = kepala !== null;
  const isian = (): IsianRingkasan => ({ ...(versiDraf ?? { kunjungan_versi: data.kunjungan.versi, revisi_ringkasan: kepala?.revisi ?? 0 }), ...isi });
  const ubah = (ganti: Partial<typeof KOSONG>) => { setIsi({ ...isi, ...ganti }); setPratinjau(null); setKonfirmasi(false); };

  async function lihatPratinjau() {
    setPesan(null);
    if (penggantian) { const salah = wajibAlasan(isi.alasan); if (salah) { setPesan(`Alasan penggantian: ${salah}`); return; } }
    setMemuatPratinjau(true);
    try { setPratinjau(await kesehatan.pratinjau(id, isian())); setKonfirmasi(false); }
    catch (e) { setPratinjau(null); setPesan(actionableError(e)); }
    finally { setMemuatPratinjau(false); }
  }
  async function terbitkan() {
    if (!pratinjau || !konfirmasi) return;
    const body = isian();
    const hasil = await terbit.run(sidikJari('terbit', id, body, pratinjau.pratinjau_hash), key => kesehatan.terbitkan(id, body, pratinjau.pratinjau_hash, key));
    if (hasil) {
      bersihkan();
      setPesan(`Ringkasan versi ${hasil.versi} ${hasil.replayed ? 'sudah terbit sebelumnya' : 'terbit'}. Notifikasi dalam aplikasi: ${hasil.notifikasi.in_app}, push: ${hasil.notifikasi.push}.`);
      await load();
    }
    // Gagal jaringan: pratinjau dan kunci idempotensi tetap, sehingga ketukan ulang memutar ulang respons server.
  }
  async function tarikRingkasan() {
    if (!kepala) return;
    const salah = wajibAlasan(alasanTarik);
    if (salah) { tarik.setError(`Alasan penarikan: ${salah}`); return; }
    const revisi = versiDraf?.revisi_ringkasan ?? kepala.revisi;
    const hasil = await tarik.run(sidikJari('tarik', id, revisi, alasanTarik), key => kesehatan.tarik(id, revisi, alasanTarik, key));
    if (hasil) { bersihkan(); setPesan('Ringkasan ditarik. Wali melihat keterangan bahwa informasi ditarik, tanpa isinya.'); await load(); }
  }

  return (
    <Halaman>
      <ThemedText type="h3">{data.kunjungan.santri.nama} · {tanggalPanjang(data.kunjungan.tanggal)}</ThemedText>
      <ChipRow>
        {kepala ? <StatusBadge status={kepala.status} /> : <StatusBadge status="Belum terbit" />}
        {data.akses.catat ? null : <StatusBadge status="Hanya baca" />}
      </ChipRow>
      <Pesan text={pesan} />

      <ThemedText type="h3">Yang dilihat wali saat ini</ThemedText>
      {data.berlaku ? <KontenRingkasan p={data.berlaku} /> : (
        <ThemedText themeColor="textSecondary">{kepala?.status === 'Ditarik' ? 'Ringkasan sudah ditarik; wali melihat keterangan "telah ditarik".' : 'Belum ada ringkasan terbit untuk kunjungan ini.'}</ThemedText>
      )}

      {data.akses.catat && data.boleh_terbit ? (
        <Panel style={{ gap: 12 }}>
          <ThemedText type="h3">{penggantian ? (kepala?.status === 'Ditarik' ? 'Terbitkan ulang' : 'Ganti ringkasan') : 'Susun ringkasan untuk wali'}</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">Catatan klinik internal tidak pernah tampil kepada wali. Tulis hanya yang perlu diketahui orang tua.</ThemedText>
          {penggantian && data.berlaku ? (
            <AppButton label="Isi dari versi berlaku" size="sm" variant="secondary"
              onPress={() => ubah({ ringkasan: data.berlaku?.ringkasan ?? '', tindakan_umum: data.berlaku?.tindakan_umum ?? '', tindak_lanjut_wali: data.berlaku?.tindak_lanjut_wali ?? '' })} />
          ) : null}
          <PrivateField label="Ringkasan (wajib, minimal 10 karakter)" value={isi.ringkasan} onChangeText={v => ubah({ ringkasan: v })} multiline maxLength={2000} />
          <PrivateField label="Penanganan di klinik" value={isi.tindakan_umum} onChangeText={v => ubah({ tindakan_umum: v })} multiline maxLength={1000} />
          <PrivateField label="Yang perlu diperhatikan orang tua" value={isi.tindak_lanjut_wali} onChangeText={v => ubah({ tindak_lanjut_wali: v })} multiline maxLength={1000} />
          {penggantian ? <PrivateField label="Alasan penggantian (wajib)" value={isi.alasan} onChangeText={v => ubah({ alasan: v })} multiline maxLength={1000} /> : null}
          <AppButton label="Lihat pratinjau" variant="secondary" loading={memuatPratinjau} disabled={memuatPratinjau || terbit.isBusy} onPress={() => void lihatPratinjau()} />
          {pratinjau ? (
            <View style={{ gap: 12 }}>
              <Divider />
              <ThemedText type="h3">Pratinjau — persis seperti dilihat wali</ThemedText>
              <KontenRingkasan p={pratinjau.pratinjau} />
              <ThemedText>Penerima berakun yang berhak saat ini: {pratinjau.penerima}. Notifikasi berisi pemberitahuan umum tanpa isi kesehatan.</ThemedText>
              <Chip label="Saya sudah memeriksa pratinjau dan ingin menerbitkannya" accessibilityRole="radio" selected={konfirmasi} onPress={() => setKonfirmasi(!konfirmasi)} />
              <AppButton label={penggantian ? 'Terbitkan versi baru' : 'Terbitkan'} loading={terbit.isBusy} disabled={!konfirmasi || terbit.isBusy} onPress={() => void terbitkan()} />
            </View>
          ) : null}
          <Pesan text={terbit.error} tone="danger" />
          {terbit.error?.includes('Muat ulang') ? <AppButton label="Muat ulang ringkasan" variant="danger" onPress={() => { bersihkan(); terbit.reset(); void load(); }} /> : null}
        </Panel>
      ) : data.akses.catat ? (
        <ThemedText themeColor="textSecondary">Ringkasan hanya dapat diterbitkan untuk kunjungan yang sudah tercatat, bukan draf.</ThemedText>
      ) : null}

      {data.akses.catat && kepala?.status === 'Terbit' ? (
        <Panel style={{ gap: 12 }}>
          <ThemedText type="h3">Tarik ringkasan</ThemedText>
          <PrivateField label="Alasan penarikan (wajib)" value={alasanTarik} onChangeText={setAlasanTarik} multiline maxLength={1000} />
          <Pesan text={tarik.error} tone="danger" />
          <AppButton label="Tarik ringkasan" variant="danger" loading={tarik.isBusy} disabled={tarik.isBusy} onPress={() => void tarikRingkasan()} />
        </Panel>
      ) : null}

      {data.akses.riwayat ? (
        <Panel style={{ gap: 10 }}>
          <ThemedText type="h3">Riwayat ringkasan</ThemedText>
          {data.penerima !== null ? <ThemedText themeColor="textSecondary">Wali berakun yang berhak saat ini: {data.penerima}</ThemedText> : null}
          {data.peristiwa.length === 0 ? <ThemedText themeColor="textSecondary">Belum ada peristiwa.</ThemedText> : null}
          {data.peristiwa.map((e, i) => (
            <View key={i} style={{ gap: 3 }}>
              {i > 0 ? <Divider /> : null}
              <ThemedText type="bodyBold">{e.jenis} · versi {e.versi}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">{e.oleh.nama} · {waktuPendek(e.waktu)} · {e.jumlah_penerima} penerima · kanal {e.kanal}</ThemedText>
              {e.alasan ? <ThemedText>Alasan: {e.alasan}</ThemedText> : null}
            </View>
          ))}
          {data.versi.map(v => (
            <View key={v.versi} style={{ gap: 3 }}>
              <Divider />
              <ThemedText type="bodyBold">Versi {v.versi} · {v.status} (dari catatan versi {v.kunjungan_versi})</ThemedText>
              <ThemedText>{v.ringkasan}</ThemedText>
              {v.tindakan_umum ? <ThemedText>Penanganan: {v.tindakan_umum}</ThemedText> : null}
              {v.tindak_lanjut_wali ? <ThemedText>Perhatian orang tua: {v.tindak_lanjut_wali}</ThemedText> : null}
              <ThemedText type="caption" themeColor="textSecondary">{v.oleh.nama} · {waktuPendek(v.diterbitkan_pada)}{v.berakhir_pada ? ` · berakhir ${waktuPendek(v.berakhir_pada)}` : ''}</ThemedText>
            </View>
          ))}
        </Panel>
      ) : null}
      <AppButton label="Muat ulang" variant="secondary" onPress={() => { bersihkan(); setPesan(null); void load(); }} />
    </Halaman>
  );
}
