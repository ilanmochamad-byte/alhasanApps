import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { actionableError, ApiError } from '@/api/client';
import { keuangan, type Pratinjau } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Pesan } from '@/components/kesehatan-shared';
import { Angka, Centang, Halaman } from '@/components/keuangan-shared';
import { PrivateField } from '@/components/private-field';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Badge, Chip, ChipRow } from '@/components/ui/chip';
import { DateField } from '@/components/ui/date-field';
import { Divider, Panel } from '@/components/ui/surface';
import { useMutationGuard } from '@/hooks/use-mutation-guard';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { labelPeriode, periodeKini, rupiah, sidikJari } from '@/keuangan/forms';

/**
 * Penerbitan tagihan bulanan: pratinjau (tanpa menulis) lalu terbitkan dengan
 * hash pratinjau. Data yang berubah sejak pratinjau dijawab 409; menjalankan
 * ulang periode yang sama tidak membuat tagihan kedua (server).
 */
export default function PenerbitanScreen() {
  const { profile } = useAuth();
  return <Form key={profile?.id} />;
}

function Form() {
  const [periode, setPeriode] = useState(periodeKini());
  const [jatuhTempo, setJatuhTempo] = useState('');
  const [unit, setUnit] = useState('');
  const [pratinjau, setPratinjau] = useState<Pratinjau | null>(null);
  const [setuju, setSetuju] = useState(false);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [hasil, setHasil] = useState<string | null>(null);
  const bersihkan = useCallback(() => { setPratinjau(null); setSetuju(false); }, []);
  const fetcher = useCallback(async () => {
    const t = await keuangan.tunggakan({}, 1);
    if (!t.akses.kelola) throw new ApiError('Penerbitan hanya oleh Petugas BSA berpenugasan aktif.', 403, 'FORBIDDEN');
    return t.unit;
  }, []);
  const { data: units, error, load } = usePrivateResource(fetcher, bersihkan, true);
  const guard = useMutationGuard('bsa-terbit');
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!units) return <LoadingState label="Memeriksa hak penerbitan…" />;

  async function lihat() {
    setGalat(null); setHasil(null); setPratinjau(null); setSetuju(false); guard.reset();
    if (!/^\d{4}-\d{2}$/.test(periode)) { setGalat('Periode berformat TTTT-BB, mis. 2026-11.'); return; }
    if (!jatuhTempo) { setGalat('Jatuh tempo wajib diisi.'); return; }
    setMemuat(true);
    try { setPratinjau(await keuangan.pratinjau({ periode, jatuh_tempo: jatuhTempo, unit })); } catch (e) { setGalat(actionableError(e)); } finally { setMemuat(false); }
  }
  async function terbitkan() {
    if (!pratinjau) return;
    if (!setuju) { guard.setError('Centang konfirmasi bahwa pratinjau sudah diperiksa.'); return; }
    const b = { periode: pratinjau.periode, jatuh_tempo: pratinjau.jatuh_tempo, unit: pratinjau.unit ?? '', pratinjau_hash: pratinjau.hash };
    const r = await guard.run(sidikJari('terbit', b), key => keuangan.terbitkan(b, key));
    if (r) { setHasil(`${r.jumlah_terbit} tagihan ${labelPeriode(b.periode)} diterbitkan${r.replayed ? ' (sudah diterbitkan sebelumnya, tidak digandakan)' : ''}.`); setPratinjau(null); setSetuju(false); }
  }
  return (
    <Halaman>
      <Panel style={{ gap: 12 }}>
        <PrivateField label="Periode (TTTT-BB)" value={periode} onChangeText={v => { setPeriode(v); setPratinjau(null); }} maxLength={7} autoCapitalize="none" />
        <DateField label="Jatuh tempo" value={jatuhTempo} onChange={v => { setJatuhTempo(v); setPratinjau(null); }} />
        {units.length > 0 ? (
          <ChipRow>
            <Chip label="Seluruh cakupan" accessibilityRole="radio" selected={unit === ''} onPress={() => { setUnit(''); setPratinjau(null); }} />
            {units.map(u => <Chip key={u} label={u} accessibilityRole="radio" selected={unit === u} onPress={() => { setUnit(u); setPratinjau(null); }} />)}
          </ChipRow>
        ) : null}
        <AppButton label="Lihat pratinjau" variant="secondary" loading={memuat} disabled={memuat || guard.isBusy} onPress={() => void lihat()} />
        <ThemedText type="caption" themeColor="textSecondary">Tarif unit dan penyesuaian per santri diatur di website.</ThemedText>
      </Panel>
      <Pesan text={galat} tone="danger" />
      <Pesan text={hasil} tone="success" />
      {pratinjau ? (
        <Panel style={{ gap: 10 }}>
          <ThemedText type="h3">Pratinjau {labelPeriode(pratinjau.periode)}</ThemedText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <Angka label="Akan terbit" nilai={String(pratinjau.jumlah.Terbit)} />
            <Angka label="Sudah ada" nilai={String(pratinjau.jumlah.SudahAda)} />
            <Angka label="Dilewati" nilai={String(pratinjau.jumlah.Dilewati)} />
            <Angka label="Total terbit" nilai={rupiah(pratinjau.total_terbit)} />
          </View>
          {pratinjau.rows.map(r => (
            <View key={r.santri_id} style={{ gap: 2 }}>
              <Divider />
              <ThemedText type="bodyBold">{r.nama} · {r.hasil === 'Terbit' ? rupiah(r.total) : r.hasil === 'SudahAda' ? 'sudah ada' : 'dilewati'}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">NIS {r.nis}{r.kelas ? ` · ${r.kelas}` : ''}{r.keterangan ? ` · ${r.keterangan}` : ''}</ThemedText>
              {r.penyesuaian.length > 0 ? <ChipRow>{r.penyesuaian.map((p, i) => <Badge key={i} label={`${p.jenis} ${p.nama} ${rupiah(p.nominal)}`} />)}</ChipRow> : null}
            </View>
          ))}
          {pratinjau.jumlah.Terbit > 0 ? (
            <>
              <Centang label={`Saya sudah memeriksa pratinjau; terbitkan ${pratinjau.jumlah.Terbit} tagihan.`} checked={setuju} onChange={setSetuju} disabled={guard.isBusy} />
              <Pesan text={guard.error} tone="danger" />
              <AppButton label="Terbitkan tagihan" loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void terbitkan()} />
            </>
          ) : <ThemedText themeColor="textSecondary">Tidak ada tagihan baru untuk diterbitkan.</ThemedText>}
        </Panel>
      ) : null}
    </Halaman>
  );
}
