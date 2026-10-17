import { View, type ViewProps } from 'react-native';
import { useCallback, useRef, useState } from 'react';
import { rapor, type Matrix, type Preview } from '@/api/rapor';
import { createIdempotencyKey } from '@/api/client';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { PrivateField } from '@/components/private-field';
import { DropdownField } from '@/components/ui/dropdown-field';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { HistoryList, Notice, RaporPage, ReportBody, useRaporResource } from '@/components/rapor-shared';
import { ThemedText } from '@/components/themed-text';
import { requireReason } from '@/rapor/forms';

export default function Screen() { const { profile } = useAuth(); return <Session key={profile?.id} />; }
function Session() {
  const [plan, setPlan] = useState(0); const [student, setStudent] = useState(0);
  const fetcher = useCallback(async () => ({ caps: await rapor.capabilities(), options: await rapor.reviewOptions(), matrix: plan ? await rapor.review(plan, student) : null }), [plan, student]);
  const r = useRaporResource(fetcher);
  return <RaporPage><Notice text={r.notice} />{r.error ? <ErrorState message={r.error} onRetry={() => void r.load()} /> : !r.data ? <LoadingState /> : <>
    <DropdownField label="Kelas dan semester" value={String(plan)} options={r.data.options.map(o => ({ value: String(o.id), label: `${o.nama_kelas} · ${o.tahun} ${o.semester}` }))} onChange={v => { setPlan(Number(v)); setStudent(0); }} disabled={r.busy} />
    {!r.data.options.length && <EmptyState title="Belum ada rencana" message="Tidak ada rencana dalam cakupan Pendidikan aktif." />}
    {!student && r.data.matrix && <DropdownField label="Santri" value="0" options={r.data.matrix.matriks.map(m => ({ value: String(m.santri.id), label: m.santri.nama_santri }))} onChange={v => setStudent(Number(v))} disabled={r.busy} searchable />}
    {student > 0 && r.data.matrix && <Review key={`${plan}:${student}:${r.generation.current}`} matrix={r.data.matrix} busy={r.busy} caps={r.data.caps.list} mutate={r.mutate} />}
    <AppButton label="Pilih santri lain" variant="secondary" disabled={r.busy} onPress={() => setStudent(0)} />
    <AppButton label="Muat ulang keadaan server" variant="secondary" disabled={r.busy} onPress={() => void r.load()} />
  </>}</RaporPage>;
}
function Review({ matrix, busy, caps, mutate }: { matrix: Matrix; busy: boolean; caps: string[]; mutate: (operation: () => Promise<unknown>, refresh?: boolean) => Promise<void> }) {
  const [reason, setReason] = useState(''); const [note, setNote] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const requestKey = useRef<{ fingerprint: string; key: string } | null>(null);
  const row = matrix.matriks[0];
  if (!row) return <ThemedText>Santri tidak tersedia.</ThemedText>;
  const plan = Number(matrix.rencana.id); const student = Number(row.santri.id);
  function verify(action: string, kind: string, key: number, check: { version: number; sumber_hash: string }) {
    return mutate(() => {
      requireReason(reason, action === 'kembalikan');
      return rapor.verify({ rencana_id: plan, santri_id: student, action, jenis: kind, mapel_key: key, version: Number(check.version), sumber_hash: check.sumber_hash, alasan: reason });
    });
  }
  function publish(action: string) {
    if (!preview) return;
    return mutate(async () => {
      requireReason(reason, action !== 'Terbit');
      const body = { action, rencana_id: plan, santri_id: student, current_version: Number(preview!.current_version), revision: Number(preview!.revision), pratinjau_hash: preview!.pratinjau_hash, catatan_umum: note, alasan: reason };
      const fingerprint = JSON.stringify(body);
      if (requestKey.current?.fingerprint !== fingerprint) requestKey.current = { fingerprint, key: createIdempotencyKey('v4-rapor') };
      // Key tetap pada retry transport; setelah 409 form ini dibongkar saat reload.
      return rapor.publish({ ...body, idempotency_key: requestKey.current.key });
    });
  }
  return <>
    <ThemedText type="h3">{row.santri.nama_santri}</ThemedText>
    <PrivateField label="Alasan pengembalian / tindakan admin" value={reason} onChangeText={setReason} multiline maxLength={1000} editable={!busy} />
    {row.bahan.map(m => <MaterialBlock key={`${m.jenis}:${m.mapel_key}`}>
      <ThemedText type="h3">{m.label}</ThemedText><ThemedText>{m.lengkap ? 'Lengkap' : 'Belum lengkap'} · {m.pemeriksaan.status} · versi {m.pemeriksaan.version}</ThemedText>
      {m.penghalang && <ThemedText>{m.penghalang}</ThemedText>}
      {m.komponen?.map((v, i) => <ThemedText key={i}>{v.komponen} {v.nomor_harian || ''}: {v.nilai} · {v.catatan}</ThemedText>)}
      {m.hasil && <ThemedText>Nilai akhir: {m.hasil.nilai_tampil ?? 'Belum lengkap'} · {m.hasil.predikat ?? '—'}</ThemedText>}
      {m.sikap && <ThemedText>Adab: {m.sikap.adab}{'\n'}Kedisiplinan: {m.sikap.kedisiplinan}{'\n'}Tanggung jawab: {m.sikap.tanggung_jawab}{'\n'}Catatan: {m.sikap.catatan}</ThemedText>}
      {m.kehadiran && <><ThemedText>{Object.entries(m.kehadiran.hitungan).map(([key, n]) => `${key}: ${n}`).join(' · ')}</ThemedText><ThemedText>Pertemuan: {m.kehadiran.jumlah_pertemuan} · Belum dicatat: {m.kehadiran.belum_dicatat}</ThemedText></>}
      {m.jenis === 'kehadiran' && ['Draf', 'Dikembalikan'].includes(m.pemeriksaan.status) && <AppButton label={`Serahkan ${m.label}`} disabled={busy} onPress={() => void verify('serahkan', m.jenis, m.mapel_key, m.pemeriksaan)} />}
      <AppButton label={`Verifikasi ${m.label}`} disabled={busy || !m.lengkap || m.pemeriksaan.status !== 'Dikirim'} onPress={() => void verify('verifikasi', m.jenis, m.mapel_key, m.pemeriksaan)} />
      <AppButton label={`Kembalikan ${m.label}`} variant="secondary" disabled={busy || m.pemeriksaan.status !== 'Dikirim'} onPress={() => void verify('kembalikan', m.jenis, m.mapel_key, m.pemeriksaan)} />
    </MaterialBlock>)}
    <ThemedText>{row.kekurangan.length ? row.kekurangan.join('\n') : 'Seluruh bahan siap untuk pemeriksaan final.'}</ThemedText>
    <HistoryList rows={row.riwayat_pemeriksaan} />
    {caps.includes('rapor.finalisasi') && <>
      <PrivateField label="Catatan umum rapor" value={note} onChangeText={v => { setNote(v); setPreview(null); }} multiline maxLength={2000} editable={!busy} />
      <AppButton label="Pratinjau rapor dari server" disabled={busy} onPress={() => void mutate(async () => {
        const result = await rapor.preview(plan, student, note); setPreview(result);
      }, false)} />
    </>}
    {preview && <><ThemedText>Status: {preview.status} · Versi saat ini {preview.current_version}</ThemedText><ReportBody s={preview.snapshot} /><ThemedText>{preview.snapshot.kekurangan?.join('\n')}</ThemedText>
      <AppButton label="Terbitkan rapor" disabled={busy || !preview.siap_terbit || preview.current_version > 0} onPress={() => void publish('Terbit')} />
      {caps.includes('rapor.buka_koreksi') && <><AppButton label="Terbitkan versi pengganti beralasan" disabled={busy || !preview.siap_terbit || preview.current_version === 0} onPress={() => void publish('Ganti')} />
        <AppButton label="Tarik rapor beralasan" variant="secondary" disabled={busy || preview.status !== 'Terbit'} onPress={() => void publish('Tarik')} />
        <AppButton label="Buka koreksi beralasan" variant="secondary" disabled={busy || preview.status !== 'Terbit'} onPress={() => void publish('Buka')} /></>}
    </>}
  </>;
}
function MaterialBlock(props: ViewProps) { return <View {...props} style={{ gap: 10, paddingVertical: 12 }} />; }
