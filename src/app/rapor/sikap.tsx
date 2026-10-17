import { useCallback, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { rapor, type AttitudeDetail } from '@/api/rapor';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { PrivateField } from '@/components/private-field';
import { DropdownField } from '@/components/ui/dropdown-field';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { HistoryList, Notice, RaporPage, useRaporResource } from '@/components/rapor-shared';
import { ThemedText } from '@/components/themed-text';
import { requireReason } from '@/rapor/forms';

const aspects = { adab: 'Adab/akhlak', kedisiplinan: 'Kedisiplinan', tanggung_jawab: 'Tanggung jawab' };
const predicates = ['Sangat Baik', 'Baik', 'Cukup', 'Perlu Bimbingan'].map(value => ({ value, label: value }));
export default function Screen() { const { profile } = useAuth(); const { mode } = useLocalSearchParams(); return <Session key={`${profile?.id}:${mode}`} mode={mode === 'murobi' ? 'murobi' : 'pembimbing'} />; }
function Session({ mode }: { mode: string }) {
  const [selection, setSelection] = useState('');
  const [plan, student] = selection.split(':').map(Number);
  const fetcher = useCallback(async () => ({ options: await rapor.attitudeOptions(mode), detail: plan && student ? await rapor.attitude(plan, student, mode) : null }), [mode, plan, student]);
  const r = useRaporResource(fetcher);
  return <RaporPage><Notice text={r.notice} />{r.error ? <ErrorState message={r.error} onRetry={() => void r.load()} /> : !r.data ? <LoadingState /> : <>
    <DropdownField label="Santri, kelas, dan semester" value={selection} options={r.data.options.map(o => ({ value: `${o.rencana_id}:${o.santri_id}`, label: `${o.nama_santri} · ${o.nama_kelas} · ${o.tahun} ${o.semester}` }))} onChange={setSelection} disabled={r.busy} searchable />
    {!r.data.options.length && <EmptyState title="Belum ada santri" message="Tidak ada santri dalam cakupan penugasan aktif." />}
    {r.data.detail && <Form key={`${selection}:${r.generation.current}`} mode={mode} detail={r.data.detail} busy={r.busy} save={(body) => r.mutate(() => {
      requireReason(String(body.alasan), body.action === 'koreksi');
      return rapor.saveAttitude({ ...body, rencana_id: plan, santri_id: student, version: Number(r.data!.detail!.sikap?.version ?? 0) }, mode);
    })} />}
    <AppButton label="Muat ulang keadaan server" variant="secondary" disabled={r.busy} onPress={() => void r.load()} />
  </>}</RaporPage>;
}
function Form({ mode, detail, busy, save }: { mode: string; detail: AttitudeDetail; busy: boolean; save: (body: Record<string, unknown>) => Promise<void> }) {
  const [values, setValues] = useState({ adab: detail.sikap?.adab ?? '', kedisiplinan: detail.sikap?.kedisiplinan ?? '', tanggung_jawab: detail.sikap?.tanggung_jawab ?? '', catatan: detail.sikap?.catatan ?? '', alasan: '' });
  return <>
    <ThemedText>Status: {detail.pemeriksaan.status} · Versi {detail.sikap?.version ?? 0} · {detail.sikap?.diketahui_murobi_user_id ? 'Diketahui murobi' : 'Belum diketahui murobi'}</ThemedText>
    {Object.entries(aspects).map(([key, label]) => <DropdownField key={key} label={label} value={values[key as keyof typeof aspects]} options={predicates} onChange={value => setValues(old => ({ ...old, [key]: value }))} disabled={busy} />)}
    <PrivateField label="Catatan pembimbing" value={values.catatan} onChangeText={catatan => setValues(old => ({ ...old, catatan }))} multiline maxLength={2000} editable={!busy} />
    <PrivateField label="Alasan koreksi (wajib untuk koreksi)" value={values.alasan} onChangeText={alasan => setValues(old => ({ ...old, alasan }))} multiline maxLength={1000} editable={!busy} />
    {mode === 'murobi' ? <AppButton label="Ketahui sikap tanpa mengubah isi" disabled={busy || !detail.sikap} onPress={() => void save({ action: 'diketahui', alasan: '' })} /> : <>
      <AppButton label="Simpan draf sikap" disabled={busy} onPress={() => void save({ ...values, action: 'draf' })} />
      <AppButton label="Serahkan sikap" disabled={busy} onPress={() => void save({ ...values, action: 'serahkan' })} />
    </>}
    <AppButton label="Koreksi sikap beralasan" variant="secondary" disabled={busy || !detail.sikap} onPress={() => void save({ ...values, action: 'koreksi' })} />
    <HistoryList rows={detail.riwayat} />
  </>;
}
