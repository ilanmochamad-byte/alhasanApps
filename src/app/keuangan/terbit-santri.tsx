import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { actionableError, ApiError } from '@/api/client';
import { keuangan, type Pratinjau } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Baris, Pesan } from '@/components/kesehatan-shared';
import { Halaman } from '@/components/keuangan-shared';
import { PrivateField } from '@/components/private-field';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { DateField } from '@/components/ui/date-field';
import { Divider, Panel } from '@/components/ui/surface';
import { useKeuanganMutation } from '@/hooks/use-keuangan-mutation';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { labelPeriode, periodeKini, pratinjauSatuSantriSah, rupiah, sidikJari } from '@/keuangan/forms';

/**
 * Terbitkan tagihan bulanan untuk SATU santri dari tarif unit dan
 * penyesuaian santri (sama dengan tombol "Terbitkan tagihan" di rincian
 * santri website). Pratinjau (tanpa menulis) lalu terbitkan dengan hash
 * pratinjau dan `santri_id`; nominal, hak, dan satu-tagihan-per-bulan
 * diputuskan server. Aplikasi menolak menerbitkan bila respons pratinjau
 * tidak terbukti hanya untuk santri ini (server lama tanpa saringan santri).
 * Isian komponen manual dan tarif tetap di website.
 */
export default function TerbitSantriScreen() {
  const { profile } = useAuth();
  const { santri_id } = useLocalSearchParams<{ santri_id: string }>();
  return <Form key={`${profile?.id}:${santri_id}`} santriId={Number(santri_id)} />;
}

function Form({ santriId }: { santriId: number }) {
  const router = useRouter();
  const [periode, setPeriode] = useState(periodeKini());
  const [jatuhTempo, setJatuhTempo] = useState(`${periodeKini()}-10`);
  const [pratinjau, setPratinjau] = useState<Pratinjau | null>(null);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const bersihkan = useCallback(() => setPratinjau(null), []);
  const fetcher = useCallback(async () => {
    if (!Number.isSafeInteger(santriId) || santriId < 1) throw new Error('Penunjuk santri tidak valid.');
    const d = await keuangan.santri(santriId, 1);
    if (!d.akses.kelola || !d.santri.aktif) throw new ApiError('Penerbitan hanya oleh Petugas BSA berpenugasan aktif untuk santri aktif.', 403, 'FORBIDDEN');
    return d.santri;
  }, [santriId]);
  const { data: santri, error, load, reject } = usePrivateResource(fetcher, bersihkan, true);
  const guard = useKeuanganMutation('bsa-terbit-santri', reject);
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!santri) return <LoadingState label="Memeriksa hak penerbitan…" />;

  async function lihat() {
    setGalat(null); setPratinjau(null); guard.reset();
    if (!/^\d{4}-\d{2}$/.test(periode)) { setGalat('Periode berformat TTTT-BB, mis. 2026-11.'); return; }
    if (!jatuhTempo) { setGalat('Jatuh tempo wajib diisi.'); return; }
    setMemuat(true);
    try {
      const p = await keuangan.pratinjau({ periode, jatuh_tempo: jatuhTempo, unit: '', santri_id: santriId });
      if (pratinjauSatuSantriSah(p, santriId)) setPratinjau(p);
      else setGalat('Server belum mendukung penerbitan satu santri. Gunakan menu Penerbitan atau website sampai server diperbarui.');
    } catch (e) {
      if (e instanceof ApiError && [401, 403, 404].includes(e.status)) reject(e); else setGalat(actionableError(e));
    } finally {
      setMemuat(false);
    }
  }
  async function terbitkan() {
    if (!pratinjau) return;
    const b = { periode: pratinjau.periode, jatuh_tempo: pratinjau.jatuh_tempo, unit: '', santri_id: santriId, pratinjau_hash: pratinjau.hash };
    const r = await guard.run(sidikJari('terbit-santri', b), key => keuangan.terbitkan(b, key));
    if (!r) return;
    // Buka tagihan yang baru terbit; rinciannya dibaca ulang dari server.
    try {
      const t = (await keuangan.santri(santriId, 1)).tagihan.find(x => x.periode === b.periode);
      if (t) { router.replace({ pathname: '/keuangan/tagihan/[id]', params: { id: String(t.id) } }); return; }
    } catch { /* rincian santri dapat dibuka dari tombol kembali */ }
    router.back();
  }
  const r = pratinjau?.rows[0];
  return (
    <Halaman>
      <Panel style={{ gap: 12 }}>
        <ThemedText type="h3">{santri.nama}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">NIS {santri.nis}{santri.kelas ? ` · ${santri.kelas}` : ''}{santri.unit ? ` · ${santri.unit}` : ''}</ThemedText>
        <PrivateField label="Periode (TTTT-BB)" value={periode} onChangeText={v => { setPeriode(v); setPratinjau(null); }} maxLength={7} autoCapitalize="none" />
        <DateField label="Jatuh tempo" value={jatuhTempo} onChange={v => { setJatuhTempo(v); setPratinjau(null); }} />
        <AppButton label="Tampilkan tagihan" variant="secondary" loading={memuat} disabled={memuat || guard.isBusy} onPress={() => void lihat()} />
        <ThemedText type="caption" themeColor="textSecondary">Nominal diambil dari tarif unit dan penyesuaian santri. Tarif diatur di website.</ThemedText>
      </Panel>
      <Pesan text={galat} tone="danger" />
      {pratinjau && r ? (
        <Panel style={{ gap: 10 }}>
          <ThemedText type="h3">Tagihan {labelPeriode(pratinjau.periode)}</ThemedText>
          {r.hasil === 'Terbit' ? (
            <>
              {(r.komponen ?? []).map((k, i) => <Baris key={`k${i}`} label={`${k.nama} (tarif unit ${r.unit ?? ''})`} value={rupiah(k.nominal)} />)}
              {r.penyesuaian.map((p, i) => <Baris key={`p${i}`} label={`${p.jenis} · ${p.nama}`} value={`${p.jenis === 'Potongan' ? '−' : '+'}${rupiah(p.nominal)}`} />)}
              <Divider />
              <Baris label="Total tagihan" value={<ThemedText type="bodyBold">{rupiah(r.total)}</ThemedText>} />
              <ThemedText type="caption" themeColor="textSecondary">Tagihan menyalin rincian ini dan tidak memotong tabungan.</ThemedText>
              <Pesan text={guard.error} tone="danger" />
              <AppButton label={`Terbitkan tagihan ${rupiah(r.total)}`} loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void terbitkan()} />
            </>
          ) : r.hasil === 'SudahAda' ? (
            <View style={{ gap: 8 }}>
              <ThemedText>{r.keterangan ?? 'Tagihan periode ini sudah ada'}. Perubahan nominal dilakukan lewat koreksi tagihan.</ThemedText>
              {r.tagihan_id ? <AppButton label="Buka tagihan" variant="secondary"
                onPress={() => router.push({ pathname: '/keuangan/tagihan/[id]', params: { id: String(r.tagihan_id) } })} /> : null}
            </View>
          ) : (
            <ThemedText>
              Tidak ada tagihan dari tarif: {(r.keterangan ?? 'tarif tidak dapat dipakai').toLowerCase()}.
              {r.keterangan === 'Belum ditempatkan di kelas' || r.keterangan === 'Belum ada tarif unit untuk periode ini'
                ? ' Tagihan dengan komponen manual atau penetapan tarif dilakukan di website.' : ''}
            </ThemedText>
          )}
        </Panel>
      ) : null}
    </Halaman>
  );
}
