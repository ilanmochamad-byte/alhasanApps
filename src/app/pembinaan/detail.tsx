import { useCallback, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { KeyboardAwareScrollView as ScrollView } from '@/components/keyboard-aware-scroll-view';
import { pembinaan, type Body } from '@/api/pembinaan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { PrivateField as Field } from '@/components/private-field';
import { DateTimeField } from '@/components/ui/date-time-field';
import { isLocalDateTime } from '@/lib/date-time';
import { ThemedText } from '@/components/themed-text';
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
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState />;
  const row = data.caseDetail?.kasus ?? data.violation!.pelanggaran;
  const manage = Boolean(data.caps['v3.konseling.kelola']); const murobi = Boolean(data.caps['v3.murobi.mengetahui']);
  const closed = ['Selesai', 'Dibatalkan'].includes(row.status);
  const mutate = async (path: string, body: Body) => {
    const epoch = generation.current;
    const r = await guard.run(JSON.stringify({ path, body }), key => pembinaan.mutate(path, { ...body, idempotency_key: key }));
    if (r && active.current && epoch === generation.current) { clear(); await load(); }
  };
  return <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 16 }}>
    <ThemedText>{row.santri_nama} · {row.status} · versi {row.version}</ThemedText>
    <AppButton label="Muat ulang versi terbaru" disabled={guard.isBusy} onPress={() => { clear(); void load(); }} />
    {data.violation && <><ThemedText>{data.violation.pelanggaran.uraian}</ThemedText><ThemedText>Total poin {data.violation.total_poin}</ThemedText>{data.violation.rekomendasi.map(r => <ThemedText key={r.id}>{r.label} · {r.rekomendasi}</ThemedText>)}{data.violation.konseling.map((r, i) => <ThemedText key={i}>Kasus #{r.kasus_id} · sesi {r.sesi_id ?? 'belum ada'}</ThemedText>)}</>}
    {data.caseDetail && <><ThemedText>{row.kerahasiaan} · {row.tujuan}</ThemedText><ThemedText>{row.ringkasan_penutupan}</ThemedText>
      {data.caseDetail.sesi_aktif.map(s => <View key={s.id} style={{ gap: 12, padding: 16, borderWidth: 1, borderRadius: 12 }}>
        <ThemedText>Sesi #{s.id} · {s.status} · {s.jadwal}</ThemedText><ThemedText>{s.ringkasan_internal}</ThemedText><ThemedText>{s.hasil}</ThemedText><ThemedText>{s.tindak_lanjut}</ThemedText>
        {manage && !closed && ['Dijadwalkan', 'Dijadwalkan Ulang'].includes(s.status) && <>
          <AppButton label={`Selesaikan sesi #${s.id} dengan isian di bawah`} disabled={!summary || !result || guard.isBusy} onPress={() => void mutate(`konseling/sesi/${s.id}/status`, { version: s.version, status: 'Selesai', ringkasan_internal: summary, hasil: result, tindak_lanjut: follow })} />
          <AppButton label="Tidak hadir" disabled={guard.isBusy} variant="secondary" onPress={() => void mutate(`konseling/sesi/${s.id}/status`, { version: s.version, status: 'Tidak Hadir' })} />
          <AppButton label="Jadwalkan ulang" disabled={!isLocalDateTime(schedule) || note.trim().length < 5 || guard.isBusy} variant="secondary" onPress={() => void mutate(`konseling/sesi/${s.id}/status`, { version: s.version, status: 'Dijadwalkan Ulang', jadwal: schedule, alasan: note })} />
          <AppButton label="Batalkan sesi" disabled={note.trim().length < 5 || guard.isBusy} variant="danger" onPress={() => void mutate(`konseling/sesi/${s.id}/status`, { version: s.version, status: 'Dibatalkan', alasan: note })} />
        </>}
        {murobi && <AppButton label="Mengetahui sesi ini" disabled={guard.isBusy} onPress={() => void mutate(`konseling/sesi/${s.id}/diketahui`, { version: s.version, catatan: note })} />}
      </View>)}
      {(manage && !closed) && <>
        <DateTimeField label="Jadwal sesi baru / jadwal ulang" value={schedule} onChange={setSchedule} disabled={guard.isBusy} />
        <Field label="Ringkasan internal sesi / ringkasan penutupan" value={summary} onChangeText={setSummary} multiline maxLength={10000} editable={!guard.isBusy} autoCorrect={false} />
        <Field label="Hasil sesi" value={result} onChangeText={setResult} multiline maxLength={5000} editable={!guard.isBusy} autoCorrect={false} />
        <Field label="Rencana tindak lanjut" value={follow} onChangeText={setFollow} multiline maxLength={5000} editable={!guard.isBusy} autoCorrect={false} />
        <AppButton label="Tambahkan sesi baru" disabled={!isLocalDateTime(schedule) || guard.isBusy} onPress={() => void mutate(`konseling/kasus/${id}/sesi`, { jadwal: schedule, tindak_lanjut: follow })} />
        {row.status === 'Dibuka' && <AppButton label="Mulai pendampingan" disabled={guard.isBusy} onPress={() => void mutate(`konseling/kasus/${id}/status`, { version: row.version, status: 'Dalam Pendampingan' })} />}
        {row.status === 'Dalam Pendampingan' && <AppButton label="Selesaikan kasus" disabled={!summary || guard.isBusy} onPress={() => void mutate(`konseling/kasus/${id}/status`, { version: row.version, status: 'Selesai', ringkasan_penutupan: summary })} />}
        <AppButton label="Batalkan kasus dengan alasan" variant="danger" disabled={note.trim().length < 5 || guard.isBusy} onPress={() => void mutate(`konseling/kasus/${id}/status`, { version: row.version, status: 'Dibatalkan', alasan: note })} />
      </>}
    </>}
    {(murobi || (manage && !closed)) && <Field label="Catatan murobi / alasan tindakan" value={note} onChangeText={setNote} multiline maxLength={5000} editable={!guard.isBusy} autoCorrect={false} />}
    {murobi && <AppButton label="Tandai mengetahui" disabled={guard.isBusy} onPress={() => void mutate(kind === 'kasus' ? `konseling/kasus/${id}/diketahui` : `pelanggaran/${id}/diketahui`, { version: row.version, catatan: note })} />}
    {(data.caseDetail?.catatan_murobi ?? data.violation?.murobi ?? []).map(n => <ThemedText key={n.id}>Catatan murobi: {n.catatan ?? 'Mengetahui'}</ThemedText>)}
    {guard.error && <ThemedText>{guard.error}</ThemedText>}
  </ScrollView>;
}
