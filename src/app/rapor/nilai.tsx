import { useCallback, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { rapor, type Grade, type GradeDetail } from '@/api/rapor';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { PrivateField } from '@/components/private-field';
import { DropdownField } from '@/components/ui/dropdown-field';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { HistoryList, Notice, RaporPage, useRaporResource } from '@/components/rapor-shared';
import { ThemedText } from '@/components/themed-text';
import { gradeDraft, gradePayload, requireReason } from '@/rapor/forms';

export default function Screen() { const { profile } = useAuth(); const { pengganti } = useLocalSearchParams(); return <Session key={`${profile?.id}:${pengganti}`} substitute={pengganti === '1'} />; }
function Session({ substitute }: { substitute: boolean }) {
  const [mapel, setMapel] = useState(0); const [student, setStudent] = useState(0);
  const fetcher = useCallback(async () => ({ options: await rapor.gradeOptions(substitute), detail: mapel ? await rapor.grade(mapel, student, substitute) : null }), [mapel, student, substitute]);
  const r = useRaporResource(fetcher);
  return <RaporPage><Notice text={r.notice} />
    {r.error ? <ErrorState message={r.error} onRetry={() => void r.load()} /> : !r.data ? <LoadingState /> : <>
      <DropdownField label="Kelas, semester, dan mapel" value={String(mapel)} options={r.data.options.map(o => ({ value: String(o.id), label: `${o.nama_kelas} · ${o.tahun} ${o.semester} · ${o.mata_pelajaran}` }))} onChange={v => { setMapel(Number(v)); setStudent(0); }} disabled={r.busy} searchable />
      {!r.data.options.length && <EmptyState title="Belum ada mapel" message="Tidak ada rencana dalam cakupan penugasan aktif." />}
      {r.data.detail && <DropdownField label="Santri" value={String(student)} options={r.data.detail.santri.map(s => ({ value: String(s.id), label: s.nama_santri }))} onChange={v => setStudent(Number(v))} disabled={r.busy} searchable />}
      {r.data.detail && student > 0 && <GradeForm key={`${mapel}:${student}:${r.generation.current}`} detail={r.data.detail} substitute={substitute} busy={r.busy} save={(action, rows, reason) => r.mutate(() => {
        requireReason(reason, substitute || action === 'koreksi');
        return rapor.saveGrade({ rencana_mapel_id: mapel, santri_id: student, action, komponen: gradePayload(rows, action), alasan: reason }, substitute);
      })} />}
      <AppButton label="Muat ulang keadaan server" variant="secondary" disabled={r.busy} onPress={() => void r.load()} />
    </>}
  </RaporPage>;
}
function GradeForm({ detail, substitute, busy, save }: { detail: GradeDetail; substitute: boolean; busy: boolean; save: (action: string, rows: Grade[], reason: string) => Promise<void> }) {
  const [rows, setRows] = useState(() => gradeDraft(detail.nilai)); const [reason, setReason] = useState('');
  function change(i: number, patch: Partial<Grade>) { setRows(old => old.map((row, n) => n === i ? { ...row, ...patch } : row)); }
  return <>
    <ThemedText>{detail.hasil.kelengkapan} · Nilai akhir {detail.hasil.nilai_tampil ?? '—'} · {detail.hasil.predikat ?? '—'}</ThemedText><ThemedText>Status bahan: {detail.pemeriksaan?.status ?? 'Draf'}</ThemedText>
    {rows.map((row, i) => <PrivateField key={`${row.komponen}:${row.nomor_harian}`} label={`${row.komponen}${row.komponen === 'Harian' ? ` ${row.nomor_harian}` : ''}`} value={row.nilai} keyboardType="decimal-pad" maxLength={6} editable={!busy} onChangeText={nilai => change(i, { nilai })} />)}
    <AppButton label="Tambah nilai harian" variant="secondary" disabled={busy || rows.filter(r => r.komponen === 'Harian').length >= 100} onPress={() => setRows(old => [...old, { komponen: 'Harian', nomor_harian: Math.max(0, ...old.filter(r => r.komponen === 'Harian').map(r => Number(r.nomor_harian))) + 1, nilai: '', catatan: '', version: 0 }])} />
    {rows.map((row, i) => <PrivateField key={`note:${row.komponen}:${row.nomor_harian}`} label={`Catatan ${row.komponen} ${row.nomor_harian || ''}`} value={row.catatan} multiline maxLength={2000} editable={!busy} onChangeText={catatan => change(i, { catatan })} />)}
    <PrivateField label={substitute ? 'Alasan pengganti / koreksi (wajib)' : 'Alasan koreksi / tindakan admin'} value={reason} onChangeText={setReason} multiline maxLength={1000} editable={!busy} />
    <ThemedText>Nilai kosong tidak menjadi 0. Koreksi tersimpan harus beralasan, kemudian diserahkan dan diverifikasi ulang.</ThemedText>
    <AppButton label="Simpan draf nilai" disabled={busy} onPress={() => void save('draf', rows, reason)} />
    <AppButton label="Serahkan nilai" disabled={busy} onPress={() => void save('serahkan', rows, reason)} />
    <AppButton label="Koreksi nilai beralasan" variant="secondary" disabled={busy} onPress={() => void save('koreksi', rows, reason)} />
    <HistoryList rows={detail.riwayat} />
  </>;
}
