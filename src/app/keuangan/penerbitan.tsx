import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { actionableError, ApiError } from '@/api/client';
import { keuangan, type Pratinjau } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { BarisPil, Centang, Halaman, HalamanKeadaan, JudulBagian, Kartu, Pesan } from '@/components/keuangan-shared';
import { PrivateField } from '@/components/private-field';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { DateField } from '@/components/ui/date-field';
import { EntityRow } from '@/components/ui/entity-row';
import { FilterPills } from '@/components/ui/filter-pills';
import { StatGrid } from '@/components/ui/stat-card';
import { StatusPill } from '@/components/ui/status-pill';
import { SuccessPanel } from '@/components/ui/success-panel';
import { useKeuanganMutation } from '@/hooks/use-keuangan-mutation';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { labelPeriode, periodeKini, rupiah, sidikJari } from '@/keuangan/forms';

const JUDUL = 'Terbitkan tagihan';

/**
 * Penerbitan tagihan bulanan (pola P-Form + pratinjau → P-Sukses): pratinjau
 * (tanpa menulis) lalu terbitkan dengan hash pratinjau. Data yang berubah
 * sejak pratinjau dijawab 409; menjalankan ulang periode yang sama tidak
 * membuat tagihan kedua (server).
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
  const { data: units, error, load, reject } = usePrivateResource(fetcher, bersihkan, true);
  const guard = useKeuanganMutation('bsa-terbit', reject);
  if (error) return <HalamanKeadaan title={JUDUL}><ErrorState message={error} onRetry={() => void load()} /></HalamanKeadaan>;
  if (!units) return <HalamanKeadaan title={JUDUL}><LoadingState label="Memeriksa hak penerbitan…" /></HalamanKeadaan>;

  async function lihat() {
    setGalat(null); setHasil(null); setPratinjau(null); setSetuju(false); guard.reset();
    if (!/^\d{4}-\d{2}$/.test(periode)) { setGalat('Periode berformat TTTT-BB, mis. 2026-11.'); return; }
    if (!jatuhTempo) { setGalat('Jatuh tempo wajib diisi.'); return; }
    setMemuat(true);
    try { setPratinjau(await keuangan.pratinjau({ periode, jatuh_tempo: jatuhTempo, unit })); } catch (e) { if (e instanceof ApiError && [401, 403, 404].includes(e.status)) reject(e); else setGalat(actionableError(e)); } finally { setMemuat(false); }
  }
  async function terbitkan() {
    if (!pratinjau) return;
    if (!setuju) { guard.setError('Centang konfirmasi bahwa pratinjau sudah diperiksa.'); return; }
    const b = { periode: pratinjau.periode, jatuh_tempo: pratinjau.jatuh_tempo, unit: pratinjau.unit ?? '', pratinjau_hash: pratinjau.hash };
    const r = await guard.run(sidikJari('terbit', b), key => keuangan.terbitkan(b, key));
    if (r) { setHasil(`${r.jumlah_terbit} tagihan ${labelPeriode(b.periode)} diterbitkan${r.replayed ? ' (sudah diterbitkan sebelumnya, tidak digandakan)' : ''}.`); setPratinjau(null); setSetuju(false); }
  }
  const bisaTerbit = Boolean(pratinjau && pratinjau.jumlah.Terbit > 0);
  return (
    <Halaman title={JUDUL}
      bawah={bisaTerbit ? <AppButton label="Terbitkan tagihan" loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void terbitkan()} style={{ flex: 1 }} /> : undefined}>
      {hasil ? <SuccessPanel title="Tagihan diterbitkan" message={hasil} /> : null}
      <Kartu>
        <PrivateField label="Periode (TTTT-BB)" icon="calendar" value={periode} onChangeText={v => { setPeriode(v); setPratinjau(null); }} maxLength={7} autoCapitalize="none" />
        <DateField label="Jatuh tempo" value={jatuhTempo} onChange={v => { setJatuhTempo(v); setPratinjau(null); }} />
        {units.length > 0 ? (
          <>
            <ThemedText type="label">Unit</ThemedText>
            <FilterPills accessibilityLabel="Unit" value={unit} onChange={u => { setUnit(u); setPratinjau(null); }}
              options={[{ value: '', label: 'Seluruh cakupan' }, ...units.map(u => ({ value: u, label: u }))]} />
          </>
        ) : null}
        <AppButton label="Lihat pratinjau" variant="secondary" icon="eye" loading={memuat} disabled={memuat || guard.isBusy} onPress={() => void lihat()} />
        <ThemedText type="caption" themeColor="textSecondary">Tarif unit dan penyesuaian per santri diatur di website.</ThemedText>
      </Kartu>
      <Pesan text={galat} tone="danger" />
      {pratinjau ? (
        <>
          <JudulBagian title={`Pratinjau ${labelPeriode(pratinjau.periode)}`} />
          <StatGrid items={[
            { icon: 'plus', label: 'Akan terbit', value: String(pratinjau.jumlah.Terbit) },
            { icon: 'check-circle', label: 'Sudah ada', value: String(pratinjau.jumlah.SudahAda), tone: 'info' },
            { icon: 'info', label: 'Dilewati', value: String(pratinjau.jumlah.Dilewati), tone: 'warning' },
            { icon: 'wallet', label: 'Total terbit', value: rupiah(pratinjau.total_terbit), tone: 'violet' },
          ]} />
          {pratinjau.rows.map(r => (
            <EntityRow key={r.santri_id} avatarName={r.nama} tone={r.hasil === 'Terbit' ? 'primary' : r.hasil === 'SudahAda' ? 'info' : 'warning'}
              title={r.nama}
              subtitle={`NIS ${r.nis}${r.kelas ? ` · ${r.kelas}` : ''}${r.keterangan ? ` · ${r.keterangan}` : ''}`}
              value={r.hasil === 'Terbit' ? rupiah(r.total) : undefined}
              pill={(
                <BarisPil>
                  {r.hasil === 'Terbit' ? <StatusPill tone="success" icon="plus" label="Akan terbit" />
                    : r.hasil === 'SudahAda' ? <StatusPill tone="info" icon="check" label="Sudah ada" />
                      : <StatusPill tone="warning" icon="info" label="Dilewati" />}
                  {r.penyesuaian.map((p, i) => <StatusPill key={i} tone="neutral" label={`${p.jenis} ${p.nama} ${rupiah(p.nominal)}`} />)}
                </BarisPil>
              )} />
          ))}
          {bisaTerbit ? (
            <View style={{ gap: 10 }}>
              <Centang label={`Saya sudah memeriksa pratinjau; terbitkan ${pratinjau.jumlah.Terbit} tagihan.`} checked={setuju} onChange={setSetuju} disabled={guard.isBusy} />
              <Pesan text={guard.error} tone="danger" />
            </View>
          ) : <Pesan tone="info" text="Tidak ada tagihan baru untuk diterbitkan." />}
        </>
      ) : null}
    </Halaman>
  );
}
