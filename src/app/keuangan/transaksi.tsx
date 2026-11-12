import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';

import { ApiError } from '@/api/client';
import { keuangan, type IsianKeluar, type IsianSetoran } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Centang, Halaman, HalamanKeadaan, Kartu, KartuSantri, Pesan } from '@/components/keuangan-shared';
import { PrivateField } from '@/components/private-field';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { FilterPills } from '@/components/ui/filter-pills';
import { ReceiptCard, type ReceiptRow } from '@/components/ui/receipt-card';
import { SuccessPanel } from '@/components/ui/success-panel';
import { useKeuanganMutation } from '@/hooks/use-keuangan-mutation';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { galatNominal, nominalKirim, rupiah, sidikJari } from '@/keuangan/forms';

type Hasil = { judul: string; pesan: string; menunggu: boolean; baris: ReceiptRow[] };

/**
 * Setoran atau penarikan/belanja tabungan oleh Petugas BSA (pola P-Form →
 * P-Sukses). Saldo dan keputusan sah/menunggu milik server; aplikasi hanya
 * mengirim isian dengan satu kunci idempotensi per isi, sehingga retry
 * jaringan atau ketukan ganda menghasilkan paling banyak satu transaksi.
 * Panel hasil tampil di atas formulir; isian tetap tersedia untuk transaksi
 * berikutnya.
 */
export default function TransaksiScreen() {
  const { profile } = useAuth();
  const { santri_id, mode } = useLocalSearchParams<{ santri_id: string; mode: string }>();
  return <Form key={`${profile?.id}:${santri_id}:${mode}`} santriId={Number(santri_id)} keluar={mode === 'keluar'} />;
}

function Form({ santriId, keluar }: { santriId: number; keluar: boolean }) {
  const router = useRouter();
  const judul = keluar ? 'Penarikan atau belanja' : 'Setoran tabungan';
  const [setoran, setSetoran] = useState<IsianSetoran>({ nominal: '', metode: 'Tunai', referensi: '', catatan: '', terverifikasi: false });
  const [pengeluaran, setPengeluaran] = useState<IsianKeluar>({ nominal: '', metode: 'Tunai', jenis: 'Penarikan', tujuan: '', referensi: '', catatan: '' });
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const bersihkan = useCallback(() => {
    setSetoran({ nominal: '', metode: 'Tunai', referensi: '', catatan: '', terverifikasi: false });
    setPengeluaran({ nominal: '', metode: 'Tunai', jenis: 'Penarikan', tujuan: '', referensi: '', catatan: '' });
    setHasil(null);
  }, []);
  // Sesudah sukses: nilai dikosongkan, pilihan jenis/cara dipertahankan untuk transaksi berikutnya.
  const kosongkanNilai = () => {
    setSetoran(v => ({ ...v, nominal: '', referensi: '', catatan: '', terverifikasi: false }));
    setPengeluaran(v => ({ ...v, nominal: '', tujuan: '', referensi: '', catatan: '' }));
  };
  const fetcher = useCallback(async () => {
    if (!Number.isSafeInteger(santriId) || santriId < 1) throw new Error('Penunjuk santri tidak valid.');
    const d = await keuangan.santri(santriId, 1);
    if (!d.akses.kelola) throw new ApiError('Transaksi hanya dicatat Petugas BSA berpenugasan aktif.', 403, 'FORBIDDEN');
    if (!d.santri.aktif) throw new ApiError('Santri tidak aktif; transaksi tidak dapat dicatat.', 403, 'FORBIDDEN');
    return d;
  }, [santriId]);
  // Isian bertahan di memori saat aplikasi ke latar; dibuang saat layar ditinggalkan atau akses ditolak.
  const { data: d, error, load, reject } = usePrivateResource(fetcher, bersihkan, true);
  const guard = useKeuanganMutation(keluar ? 'bsa-keluar' : 'bsa-setoran', reject);
  if (error) return <HalamanKeadaan title={judul}><ErrorState message={error} onRetry={() => void load()} /></HalamanKeadaan>;
  if (!d) return <HalamanKeadaan title={judul}><LoadingState label="Memeriksa hak dan saldo…" /></HalamanKeadaan>;
  const isi = keluar ? pengeluaran : setoran;
  const transfer = isi.metode === 'Transfer';
  const santri = d.santri;

  async function simpan() {
    setHasil(null);
    const g = galatNominal(isi.nominal);
    if (g) { guard.setError(g); return; }
    if (transfer && !isi.referensi.trim()) { guard.setError('Referensi transfer wajib diisi agar dapat diperiksa.'); return; }
    if (keluar && pengeluaran.tujuan.trim().length < 3) { guard.setError('Tujuan penarikan/belanja wajib diisi (minimal 3 karakter).'); return; }
    if (keluar) {
      const kirim = { ...pengeluaran, nominal: nominalKirim(pengeluaran.nominal), tujuan: pengeluaran.tujuan.trim(), referensi: pengeluaran.referensi.trim(), catatan: pengeluaran.catatan.trim() };
      const r = await guard.run(sidikJari('keluar', santriId, kirim), key => keuangan.keluar(santriId, kirim, key));
      if (r) {
        const jenis = r.jenis ?? kirim.jenis;
        setHasil({
          judul: `${jenis} tercatat`, menunggu: false,
          pesan: `${jenis} ${rupiah(Number(kirim.nominal))} tercatat sah${r.replayed ? ' (sudah tercatat sebelumnya, tidak digandakan)' : ''}. Saldo kini ${rupiah(r.saldo_sesudah)}.`,
          baris: [
            ...(r.nomor_kuitansi ? [{ label: 'No. kuitansi', value: r.nomor_kuitansi }] : []),
            { label: 'Santri', value: `${santri.nama} · NIS ${santri.nis}` },
            { label: 'Jenis', value: `${jenis} (${kirim.metode.toLowerCase()})` },
            { label: 'Tujuan', value: kirim.tujuan },
            { label: 'Nominal', value: `−${rupiah(Number(kirim.nominal))}` },
            { label: 'Saldo sesudah', value: rupiah(r.saldo_sesudah), emphasis: true },
          ],
        });
        kosongkanNilai(); void load();
      }
      return;
    }
    const kirim = { ...setoran, nominal: nominalKirim(setoran.nominal), referensi: setoran.referensi.trim(), catatan: setoran.catatan.trim() };
    const r = await guard.run(sidikJari('setoran', santriId, kirim), key => keuangan.setoran(santriId, kirim, key));
    if (r) {
      const menunggu = r.status_setoran === 'Menunggu';
      setHasil({
        judul: menunggu ? 'Menunggu verifikasi' : 'Setoran tercatat', menunggu,
        pesan: menunggu
          ? `Setoran transfer ${rupiah(Number(kirim.nominal))} masuk antrean verifikasi. Saldo belum berubah (${rupiah(r.saldo_sesudah)}).`
          : `Setoran ${rupiah(Number(kirim.nominal))} tercatat sah${r.replayed ? ' (sudah tercatat sebelumnya, tidak digandakan)' : ''}. Saldo kini ${rupiah(r.saldo_sesudah)}.`,
        baris: [
          ...(r.nomor_kuitansi ? [{ label: 'No. kuitansi', value: r.nomor_kuitansi }] : []),
          { label: 'Santri', value: `${santri.nama} · NIS ${santri.nis}` },
          { label: 'Cara', value: kirim.metode },
          { label: 'Nominal', value: menunggu ? rupiah(Number(kirim.nominal)) : `+${rupiah(Number(kirim.nominal))}` },
          { label: menunggu ? 'Saldo (belum berubah)' : 'Saldo sesudah', value: rupiah(r.saldo_sesudah), emphasis: true },
        ],
      });
      kosongkanNilai(); void load();
    }
  }

  const ubah = (ganti: Partial<IsianSetoran & IsianKeluar>) => keluar
    ? setPengeluaran({ ...pengeluaran, ...ganti } as IsianKeluar)
    : setSetoran({ ...setoran, ...ganti } as IsianSetoran);

  return (
    <Halaman title={judul}
      bawah={(
        <>
          <AppButton label="Kembali ke santri" variant="secondary" disabled={guard.isBusy} onPress={() => router.back()} style={styles.flex} />
          <AppButton label={keluar ? `Catat ${pengeluaran.jenis.toLowerCase()}` : 'Catat setoran'} loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void simpan()} style={styles.flex} />
        </>
      )}>
      {hasil ? (
        <>
          <SuccessPanel title={hasil.judul} message={hasil.pesan} tone={hasil.menunggu ? 'menunggu' : 'berhasil'} />
          <ReceiptCard title={keluar ? 'Bukti pengeluaran tabungan' : 'Bukti setoran tabungan'} rows={hasil.baris}
            footer={hasil.menunggu ? 'Menunggu verifikasi Petugas BSA; belum menambah saldo.' : 'Cetak/PDF kuitansi tersedia di website BSA.'} />
          <ThemedText selectable type="label">Transaksi berikutnya</ThemedText>
        </>
      ) : null}
      <KartuSantri nama={santri.nama} keterangan={`NIS ${santri.nis}${santri.kelas ? ` · ${santri.kelas}` : ''}`}
        angka={[{ label: 'Saldo saat ini', nilai: rupiah(d.saldo) }]} />
      <Kartu>
        {keluar ? (
          <>
            <ThemedText type="label">Jenis</ThemedText>
            <FilterPills accessibilityLabel="Jenis pengeluaran" value={pengeluaran.jenis} onChange={v => ubah({ jenis: v })}
              options={[{ value: 'Penarikan', label: 'Penarikan' }, { value: 'Belanja', label: 'Belanja' }]} />
          </>
        ) : null}
        <ThemedText type="label">{keluar ? 'Cara pengeluaran' : 'Cara penerimaan'}</ThemedText>
        <FilterPills accessibilityLabel={keluar ? 'Cara pengeluaran' : 'Cara penerimaan'} value={isi.metode} onChange={v => ubah({ metode: v })}
          options={[{ value: 'Tunai', label: 'Tunai' }, { value: 'Transfer', label: 'Transfer' }]} />
        <PrivateField label="Nominal (rupiah)" awalan="Rp" value={isi.nominal} onChangeText={v => ubah({ nominal: v })} keyboardType="number-pad" maxLength={16} editable={!guard.isBusy} placeholder="mis. 100.000" />
        {keluar ? <PrivateField label="Tujuan (wajib)" icon="pin" value={pengeluaran.tujuan} onChangeText={v => ubah({ tujuan: v })} maxLength={255} editable={!guard.isBusy} /> : null}
        {transfer ? <PrivateField label="Referensi transfer (wajib)" icon="text-size" value={isi.referensi} onChangeText={v => ubah({ referensi: v })} maxLength={100} editable={!guard.isBusy} /> : null}
        <PrivateField label="Catatan internal" hint={`Opsional · ${isi.catatan.length}/500`} value={isi.catatan} onChangeText={v => ubah({ catatan: v })} multiline maxLength={500} editable={!guard.isBusy} />
        {!keluar && transfer ? (
          <>
            <Centang label="Saya sudah memeriksa dana transfer ini masuk." checked={setoran.terverifikasi} onChange={v => ubah({ terverifikasi: v })} disabled={guard.isBusy} />
            <ThemedText type="caption" themeColor="textSecondary">Tanpa centang, setoran masuk antrean verifikasi dan belum menambah saldo.</ThemedText>
          </>
        ) : null}
        {keluar ? <ThemedText type="caption" themeColor="textSecondary">Pengeluaran melebihi saldo ditolak server. Petugas pencatat sekaligus menyetujui.</ThemedText> : null}
      </Kartu>
      <Pesan text={guard.error} tone="danger" />
    </Halaman>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
