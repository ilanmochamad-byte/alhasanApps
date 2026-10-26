import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { ApiError } from '@/api/client';
import { keuangan, type IsianKeluar, type IsianSetoran } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Pesan } from '@/components/kesehatan-shared';
import { Centang, Halaman } from '@/components/keuangan-shared';
import { PrivateField } from '@/components/private-field';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Chip, ChipRow } from '@/components/ui/chip';
import { Panel } from '@/components/ui/surface';
import { useKeuanganMutation } from '@/hooks/use-keuangan-mutation';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { galatNominal, nominalKirim, rupiah, sidikJari } from '@/keuangan/forms';

/**
 * Setoran atau penarikan/belanja tabungan oleh Petugas BSA. Saldo dan
 * keputusan sah/menunggu milik server; aplikasi hanya mengirim isian dengan
 * satu kunci idempotensi per isi, sehingga retry jaringan atau ketukan ganda
 * menghasilkan paling banyak satu transaksi.
 */
export default function TransaksiScreen() {
  const { profile } = useAuth();
  const { santri_id, mode } = useLocalSearchParams<{ santri_id: string; mode: string }>();
  return <Form key={`${profile?.id}:${santri_id}:${mode}`} santriId={Number(santri_id)} keluar={mode === 'keluar'} />;
}

function Form({ santriId, keluar }: { santriId: number; keluar: boolean }) {
  const router = useRouter();
  const [setoran, setSetoran] = useState<IsianSetoran>({ nominal: '', metode: 'Tunai', referensi: '', catatan: '', terverifikasi: false });
  const [pengeluaran, setPengeluaran] = useState<IsianKeluar>({ nominal: '', metode: 'Tunai', jenis: 'Penarikan', tujuan: '', referensi: '', catatan: '' });
  const [hasil, setHasil] = useState<string | null>(null);
  const bersihkan = useCallback(() => {
    setSetoran({ nominal: '', metode: 'Tunai', referensi: '', catatan: '', terverifikasi: false });
    setPengeluaran({ nominal: '', metode: 'Tunai', jenis: 'Penarikan', tujuan: '', referensi: '', catatan: '' });
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
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!d) return <LoadingState label="Memeriksa hak dan saldo…" />;
  const isi = keluar ? pengeluaran : setoran;
  const transfer = isi.metode === 'Transfer';

  async function simpan() {
    setHasil(null);
    const g = galatNominal(isi.nominal);
    if (g) { guard.setError(g); return; }
    if (transfer && !isi.referensi.trim()) { guard.setError('Referensi transfer wajib diisi agar dapat diperiksa.'); return; }
    if (keluar && pengeluaran.tujuan.trim().length < 3) { guard.setError('Tujuan penarikan/belanja wajib diisi (minimal 3 karakter).'); return; }
    if (keluar) {
      const kirim = { ...pengeluaran, nominal: nominalKirim(pengeluaran.nominal), tujuan: pengeluaran.tujuan.trim(), referensi: pengeluaran.referensi.trim(), catatan: pengeluaran.catatan.trim() };
      const r = await guard.run(sidikJari('keluar', santriId, kirim), key => keuangan.keluar(santriId, kirim, key));
      if (r) { setHasil(`${r.jenis ?? kirim.jenis} ${rupiah(Number(kirim.nominal))} tercatat sah${r.replayed ? ' (sudah tercatat sebelumnya, tidak digandakan)' : ''}. Saldo kini ${rupiah(r.saldo_sesudah)}.`); kosongkanNilai(); void load(); }
      return;
    }
    const kirim = { ...setoran, nominal: nominalKirim(setoran.nominal), referensi: setoran.referensi.trim(), catatan: setoran.catatan.trim() };
    const r = await guard.run(sidikJari('setoran', santriId, kirim), key => keuangan.setoran(santriId, kirim, key));
    if (r) {
      setHasil(r.status_setoran === 'Menunggu'
        ? `Setoran transfer ${rupiah(Number(kirim.nominal))} masuk antrean verifikasi. Saldo belum berubah (${rupiah(r.saldo_sesudah)}).`
        : `Setoran ${rupiah(Number(kirim.nominal))} tercatat sah${r.replayed ? ' (sudah tercatat sebelumnya, tidak digandakan)' : ''}. Saldo kini ${rupiah(r.saldo_sesudah)}.`);
      kosongkanNilai(); void load();
    }
  }

  const ubah = (ganti: Partial<IsianSetoran & IsianKeluar>) => keluar
    ? setPengeluaran({ ...pengeluaran, ...ganti } as IsianKeluar)
    : setSetoran({ ...setoran, ...ganti } as IsianSetoran);

  return (
    <Halaman>
      <Panel style={{ gap: 6 }}>
        <ThemedText type="h3">{keluar ? 'Penarikan atau belanja' : 'Setoran tabungan'}</ThemedText>
        <ThemedText>{d.santri.nama} · NIS {d.santri.nis}</ThemedText>
        <ThemedText type="bodyBold">Saldo saat ini {rupiah(d.saldo)}</ThemedText>
      </Panel>
      <Panel style={{ gap: 12 }}>
        {keluar ? (
          <ChipRow>
            <Chip label="Penarikan" accessibilityRole="radio" selected={pengeluaran.jenis === 'Penarikan'} onPress={() => ubah({ jenis: 'Penarikan' })} />
            <Chip label="Belanja" accessibilityRole="radio" selected={pengeluaran.jenis === 'Belanja'} onPress={() => ubah({ jenis: 'Belanja' })} />
          </ChipRow>
        ) : null}
        <ThemedText type="label">{keluar ? 'Cara pengeluaran' : 'Cara penerimaan'}</ThemedText>
        <ChipRow>
          <Chip label="Tunai" accessibilityRole="radio" selected={isi.metode === 'Tunai'} onPress={() => ubah({ metode: 'Tunai' })} />
          <Chip label="Transfer" accessibilityRole="radio" selected={isi.metode === 'Transfer'} onPress={() => ubah({ metode: 'Transfer' })} />
        </ChipRow>
        <PrivateField label="Nominal (rupiah)" value={isi.nominal} onChangeText={v => ubah({ nominal: v })} keyboardType="number-pad" maxLength={16} editable={!guard.isBusy} placeholder="mis. 100.000" />
        {keluar ? <PrivateField label="Tujuan (wajib)" value={pengeluaran.tujuan} onChangeText={v => ubah({ tujuan: v })} maxLength={255} editable={!guard.isBusy} /> : null}
        {transfer ? <PrivateField label="Referensi transfer (wajib)" value={isi.referensi} onChangeText={v => ubah({ referensi: v })} maxLength={100} editable={!guard.isBusy} /> : null}
        <PrivateField label="Catatan internal" hint="Opsional" value={isi.catatan} onChangeText={v => ubah({ catatan: v })} multiline maxLength={500} editable={!guard.isBusy} />
        {!keluar && transfer ? (
          <>
            <Centang label="Saya sudah memeriksa dana transfer ini masuk." checked={setoran.terverifikasi} onChange={v => ubah({ terverifikasi: v })} disabled={guard.isBusy} />
            <ThemedText type="caption" themeColor="textSecondary">Tanpa centang, setoran masuk antrean verifikasi dan belum menambah saldo.</ThemedText>
          </>
        ) : null}
        {keluar ? <ThemedText type="caption" themeColor="textSecondary">Pengeluaran melebihi saldo ditolak server. Petugas pencatat sekaligus menyetujui.</ThemedText> : null}
      </Panel>
      <Pesan text={guard.error} tone="danger" />
      <Pesan text={hasil} tone="success" />
      <AppButton label={keluar ? `Catat ${pengeluaran.jenis.toLowerCase()}` : 'Catat setoran'} loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void simpan()} />
      <AppButton label="Kembali ke santri" variant="secondary" disabled={guard.isBusy} onPress={() => router.back()} />
    </Halaman>
  );
}
