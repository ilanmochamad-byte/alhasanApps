import { useCallback, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { pembinaan, type Body } from '@/api/pembinaan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { PrivateField as Field } from '@/components/private-field';
import { DateTimeField } from '@/components/ui/date-time-field';
import { isLocalDateTime } from '@/lib/date-time';
import { HalamanStack, HalamanStackKeadaan, JudulBagianIsi, KartuIsi, KepalaRincian } from '@/components/halaman-stack';
import { ThemedText } from '@/components/themed-text';
import { Notice } from '@/components/ui/notice';
import { StatusPill } from '@/components/ui/status-pill';
import { labelKerahasiaan, nadaStatusPembinaan } from '@/lib/pembinaan-tampilan';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { useMutationGuard } from '@/hooks/use-mutation-guard';
import { usePrivateResource } from '@/hooks/use-private-resource';
export default function Detail() {
  const { profile } = useAuth(); const { jenis, id } = useLocalSearchParams<{ jenis: string; id: string }>();
  return <DetailSession key={`${profile?.id}:${jenis}:${id}`} kind={jenis} id={Number(id)} />;
}
function DetailSession({ kind, id }: { kind: string; id: number }) {
  const [note, setNote] = useState(''); const [schedule, setSchedule] = useState(''); const [summary, setSummary] = useState(''); const [result, setResult] = useState(''); const [follow, setFollow] = useState('');
  const guard = useMutationGuard('v3-detail', true);
  const clear = () => { setNote(''); setSchedule(''); setSummary(''); setResult(''); setFollow(''); guard.reset(); };
  const fetcher = useCallback(async () => {
    if (!Number.isSafeInteger(id) || id < 1 || !['kasus', 'pelanggaran'].includes(kind)) throw new Error('Informasi tidak dapat diakses.');
    const caps = await pembinaan.capabilities();
    return { caps: caps.capabilities, caseDetail: kind === 'kasus' ? await pembinaan.case(id) : null, violation: kind === 'pelanggaran' ? await pembinaan.violation(id) : null };
  }, [id, kind]);
  const { data, error, load, active, generation } = usePrivateResource(fetcher, clear, true);
  const judul = kind === 'kasus' ? 'Rincian kasus' : 'Rincian pelanggaran';
  if (error) return <HalamanStackKeadaan title={judul}><ErrorState message={error} onRetry={() => void load()} /></HalamanStackKeadaan>;
  if (!data) return <HalamanStackKeadaan title={judul}><LoadingState /></HalamanStackKeadaan>;
  const row = data.caseDetail?.kasus ?? data.violation!.pelanggaran;
  const manage = Boolean(data.caps['v3.konseling.kelola']); const murobi = Boolean(data.caps['v3.murobi.mengetahui']);
  const closed = ['Selesai', 'Dibatalkan'].includes(row.status);
  const mutate = async (path: string, body: Body) => {
    const epoch = generation.current;
    const r = await guard.run(JSON.stringify({ path, body }), key => pembinaan.mutate(path, { ...body, idempotency_key: key }));
    if (r && active.current && epoch === generation.current) { clear(); await load(); }
  };
  const kerahasiaan = labelKerahasiaan(row.kerahasiaan);
  return <HalamanStack title={judul}>
    <KepalaRincian nama={row.santri_nama} judul={row.santri_nama ?? judul}
      keterangan={data.violation ? [row.kategori, `Total poin ${data.violation.total_poin}`].filter(Boolean).join(' · ') : undefined}
      pills={<>
        <StatusPill label={row.status} tone={nadaStatusPembinaan(row.status)} />
        <StatusPill label={`versi ${row.version}`} tone="neutral" />
        {kerahasiaan ? <StatusPill label={kerahasiaan} tone="neutral" icon="lock" /> : null}
      </>} />
    <AppButton label="Muat ulang versi terbaru" variant="secondary" icon="refresh" disabled={guard.isBusy} onPress={() => { clear(); void load(); }} />
    {data.violation && <>
      <JudulBagianIsi title="Ringkasan" />
      <KartuIsi>
        <ThemedText>{data.violation.pelanggaran.uraian}</ThemedText>
        <ThemedText type="bodyBold">Total poin {data.violation.total_poin}</ThemedText>
        {data.violation.rekomendasi.map(r => <ThemedText key={r.id}>{r.label} · {r.rekomendasi}</ThemedText>)}
        {data.violation.konseling.map((r, i) => <ThemedText key={i}>Kasus #{r.kasus_id} · sesi {r.sesi_id ?? 'belum ada'}</ThemedText>)}
      </KartuIsi>
    </>}
    {data.caseDetail && <>
      <JudulBagianIsi title="Ringkasan" icon={row.kerahasiaan ? 'lock' : undefined} />
      <KartuIsi>
        <ThemedText>{row.kerahasiaan} · {row.tujuan}</ThemedText>
        {row.ringkasan_penutupan ? <ThemedText>{row.ringkasan_penutupan}</ThemedText> : null}
      </KartuIsi>
      <JudulBagianIsi title={`Sesi (${data.caseDetail.sesi_aktif.length})`} />
      {data.caseDetail.sesi_aktif.length === 0 ? <ThemedText themeColor="textSecondary">Belum ada sesi aktif.</ThemedText> : null}
      {data.caseDetail.sesi_aktif.map(s => <KartuIsi key={s.id}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <ThemedText type="bodyBold">Sesi #{s.id} · {s.jadwal}</ThemedText>
          <StatusPill label={s.status} tone={nadaStatusPembinaan(s.status)} />
        </View>
        {s.ringkasan_internal ? <ThemedText>{s.ringkasan_internal}</ThemedText> : null}
        {s.hasil ? <ThemedText>{s.hasil}</ThemedText> : null}
        {s.tindak_lanjut ? <ThemedText>{s.tindak_lanjut}</ThemedText> : null}
        {manage && !closed && ['Dijadwalkan', 'Dijadwalkan Ulang'].includes(s.status) && <>
          <AppButton label={`Selesaikan sesi #${s.id} dengan isian di bawah`} disabled={!summary || !result || guard.isBusy} onPress={() => void mutate(`konseling/sesi/${s.id}/status`, { version: s.version, status: 'Selesai', ringkasan_internal: summary, hasil: result, tindak_lanjut: follow })} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <AppButton label="Tidak hadir" size="sm" disabled={guard.isBusy} variant="secondary" onPress={() => void mutate(`konseling/sesi/${s.id}/status`, { version: s.version, status: 'Tidak Hadir' })} />
            <AppButton label="Jadwalkan ulang" size="sm" disabled={!isLocalDateTime(schedule) || note.trim().length < 5 || guard.isBusy} variant="secondary" onPress={() => void mutate(`konseling/sesi/${s.id}/status`, { version: s.version, status: 'Dijadwalkan Ulang', jadwal: schedule, alasan: note })} />
            <AppButton label="Batalkan sesi" size="sm" disabled={note.trim().length < 5 || guard.isBusy} variant="danger" onPress={() => void mutate(`konseling/sesi/${s.id}/status`, { version: s.version, status: 'Dibatalkan', alasan: note })} />
          </View>
        </>}
        {murobi && <AppButton label="Mengetahui sesi ini" size="sm" variant="secondary" disabled={guard.isBusy} onPress={() => void mutate(`konseling/sesi/${s.id}/diketahui`, { version: s.version, catatan: note })} />}
      </KartuIsi>)}
      {(manage && !closed) && <>
        <JudulBagianIsi title="Isian sesi dan kasus" />
        <KartuIsi>
          <DateTimeField label="Jadwal sesi baru / jadwal ulang" value={schedule} onChange={setSchedule} disabled={guard.isBusy} />
          <Field label="Ringkasan internal sesi / ringkasan penutupan" value={summary} onChangeText={setSummary} multiline maxLength={10000} editable={!guard.isBusy} autoCorrect={false} />
          <Field label="Hasil sesi" value={result} onChangeText={setResult} multiline maxLength={5000} editable={!guard.isBusy} autoCorrect={false} />
          <Field label="Rencana tindak lanjut" value={follow} onChangeText={setFollow} multiline maxLength={5000} editable={!guard.isBusy} autoCorrect={false} />
          <AppButton label="Tambahkan sesi baru" icon="plus" disabled={!isLocalDateTime(schedule) || guard.isBusy} onPress={() => void mutate(`konseling/kasus/${id}/sesi`, { jadwal: schedule, tindak_lanjut: follow })} />
          {row.status === 'Dibuka' && <AppButton label="Mulai pendampingan" disabled={guard.isBusy} onPress={() => void mutate(`konseling/kasus/${id}/status`, { version: row.version, status: 'Dalam Pendampingan' })} />}
          {row.status === 'Dalam Pendampingan' && <AppButton label="Selesaikan kasus" disabled={!summary || guard.isBusy} onPress={() => void mutate(`konseling/kasus/${id}/status`, { version: row.version, status: 'Selesai', ringkasan_penutupan: summary })} />}
          <AppButton label="Batalkan kasus dengan alasan" variant="danger" disabled={note.trim().length < 5 || guard.isBusy} onPress={() => void mutate(`konseling/kasus/${id}/status`, { version: row.version, status: 'Dibatalkan', alasan: note })} />
        </KartuIsi>
      </>}
    </>}
    {(murobi || (manage && !closed)) && <KartuIsi>
      <Field label="Catatan murobi / alasan tindakan" value={note} onChangeText={setNote} multiline maxLength={5000} editable={!guard.isBusy} autoCorrect={false} />
      {murobi && <AppButton label="Tandai mengetahui" icon="check" disabled={guard.isBusy} onPress={() => void mutate(kind === 'kasus' ? `konseling/kasus/${id}/diketahui` : `pelanggaran/${id}/diketahui`, { version: row.version, catatan: note })} />}
    </KartuIsi>}
    {(data.caseDetail?.catatan_murobi ?? data.violation?.murobi ?? []).map(n => <ThemedText key={n.id}>Catatan murobi: {n.catatan ?? 'Mengetahui'}</ThemedText>)}
    <Pesan text={guard.error} />
  </HalamanStack>;
}

/** Galat penjaga mutasi: ikon + teks. */
function Pesan({ text }: { text: string | null }) {
  return text ? <Notice text={text} tone="danger" /> : null;
}
